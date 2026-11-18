-- Pre-chequeo del mínimo antes de insertar (evita huecos en la numeración de pedidos).
create or replace function shangai.crear_pedido(p_datos jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conf shangai.configuracion;
  v_cliente jsonb := coalesce(p_datos -> 'cliente', '{}'::jsonb);
  v_entrega jsonb := coalesce(p_datos -> 'entrega', '{}'::jsonb);
  v_metodo_pago text := p_datos ->> 'metodo_pago';
  v_entrega_id text := v_entrega ->> 'metodo';
  v_nombre text := btrim(coalesce(v_cliente ->> 'nombre', ''));
  v_tel text := regexp_replace(coalesce(v_cliente ->> 'telefono', ''), '\D', '', 'g');
  v_email text := nullif(lower(btrim(coalesce(v_cliente ->> 'email', ''))), '');
  v_opcion jsonb;
  v_direccion jsonb;
  v_pedido shangai.pedidos;
  v_carga jsonb;
  v_subtotal numeric;
  v_descuento numeric := 0;
  v_envio numeric;
  v_cliente_id uuid;
  v_previo numeric;
begin
  select * into v_conf from shangai.configuracion where id;

  -- Pre-chequeo del mínimo ANTES de insertar: así un intento rechazado no consume un número de pedido.
  select coalesce(sum(shangai_private.precio_vigente(pr.precio, pr.precio_oferta, pr.oferta_hasta) * x.cantidad), 0)
    into v_previo
    from (
      select y.producto_id, sum(y.cantidad)::int as cantidad
        from jsonb_to_recordset(coalesce(p_datos -> 'items', '[]'::jsonb)) as y (producto_id uuid, cantidad int)
       group by y.producto_id
    ) x
    join shangai.productos pr on pr.id = x.producto_id and pr.activo;
  if v_previo < v_conf.compra_minima then
    raise exception 'La compra mínima es de %. Te faltan % para completarla.',
      shangai_private.pesos(v_conf.compra_minima), shangai_private.pesos(v_conf.compra_minima - v_previo)
      using errcode = 'P0001';
  end if;

  if char_length(v_nombre) < 2 then
    raise exception 'Ingresá tu nombre y apellido.' using errcode = 'P0001';
  end if;
  if char_length(v_tel) < 8 or char_length(v_tel) > 15 then
    raise exception 'Ingresá un teléfono válido, con código de área.' using errcode = 'P0001';
  end if;
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'El email no parece válido.' using errcode = 'P0001';
  end if;

  if v_metodo_pago is null or v_metodo_pago not in ('mercadopago', 'transferencia', 'efectivo') then
    raise exception 'Elegí cómo vas a pagar.' using errcode = 'P0001';
  end if;
  if v_metodo_pago = 'mercadopago' and not (v_conf.pago_mercadopago and v_conf.mp_conectado) then
    raise exception 'Mercado Pago no está disponible en este momento. Elegí otro medio de pago.' using errcode = 'P0001';
  end if;
  if v_metodo_pago = 'transferencia' and not v_conf.pago_transferencia then
    raise exception 'El pago por transferencia no está disponible.' using errcode = 'P0001';
  end if;
  if v_metodo_pago = 'efectivo' and not v_conf.pago_efectivo then
    raise exception 'El pago en efectivo no está disponible.' using errcode = 'P0001';
  end if;
  if v_metodo_pago = 'efectivo' and v_entrega_id <> 'retiro' then
    raise exception 'El pago en efectivo es solo retirando en el local.' using errcode = 'P0001';
  end if;

  select e into v_opcion
    from jsonb_array_elements(v_conf.envios) e
   where e ->> 'id' = v_entrega_id and coalesce((e ->> 'activo')::boolean, true)
   limit 1;
  if v_opcion is null then
    raise exception 'Elegí una forma de entrega.' using errcode = 'P0001';
  end if;

  if v_entrega_id <> 'retiro' then
    v_direccion := jsonb_strip_nulls(jsonb_build_object(
      'calle', nullif(btrim(coalesce(v_entrega -> 'direccion' ->> 'calle', '')), ''),
      'ciudad', nullif(btrim(coalesce(v_entrega -> 'direccion' ->> 'ciudad', '')), ''),
      'provincia', nullif(btrim(coalesce(v_entrega -> 'direccion' ->> 'provincia', '')), ''),
      'cp', nullif(btrim(coalesce(v_entrega -> 'direccion' ->> 'cp', '')), ''),
      'referencias', nullif(btrim(coalesce(v_entrega -> 'direccion' ->> 'referencias', '')), '')
    ));
    if v_direccion ->> 'calle' is null or v_direccion ->> 'ciudad' is null then
      raise exception 'Completá la dirección de entrega (calle, número y ciudad).' using errcode = 'P0001';
    end if;
  end if;

  insert into shangai.pedidos (
    canal, metodo_pago, cliente_nombre, cliente_telefono, cliente_email, cliente_documento, cliente_negocio,
    entrega_metodo, entrega_nombre, entrega_direccion, notas
  ) values (
    'web', v_metodo_pago, v_nombre, v_tel, v_email,
    nullif(btrim(coalesce(v_cliente ->> 'documento', '')), ''),
    nullif(btrim(coalesce(v_cliente ->> 'negocio', '')), ''),
    v_entrega_id, coalesce(v_opcion ->> 'nombre', v_entrega_id), v_direccion,
    nullif(left(btrim(coalesce(p_datos ->> 'notas', '')), 1000), '')
  ) returning * into v_pedido;

  v_carga := shangai_private.cargar_items(v_pedido.id, p_datos -> 'items');
  v_subtotal := (v_carga ->> 'subtotal')::numeric;

  if v_subtotal < v_conf.compra_minima then
    raise exception 'La compra mínima es de %. Te faltan % para completarla.',
      shangai_private.pesos(v_conf.compra_minima), shangai_private.pesos(v_conf.compra_minima - v_subtotal)
      using errcode = 'P0001';
  end if;

  if v_metodo_pago = 'transferencia' and v_conf.descuento_transferencia > 0 then
    v_descuento := round(v_subtotal * v_conf.descuento_transferencia / 100);
  end if;

  v_envio := case when v_opcion ? 'precio' and jsonb_typeof(v_opcion -> 'precio') = 'number'
                  then (v_opcion ->> 'precio')::numeric end;
  if v_envio is not null and jsonb_typeof(v_opcion -> 'gratis_desde') = 'number'
     and v_subtotal >= (v_opcion ->> 'gratis_desde')::numeric then
    v_envio := 0;
  end if;

  insert into shangai.clientes (nombre, telefono, email, documento, negocio, ciudad, provincia)
  values (
    v_nombre, v_tel, v_email,
    nullif(btrim(coalesce(v_cliente ->> 'documento', '')), ''),
    nullif(btrim(coalesce(v_cliente ->> 'negocio', '')), ''),
    v_direccion ->> 'ciudad', v_direccion ->> 'provincia'
  )
  on conflict (telefono) where telefono is not null and telefono <> '' do update
     set nombre = excluded.nombre,
         email = coalesce(excluded.email, shangai.clientes.email),
         documento = coalesce(excluded.documento, shangai.clientes.documento),
         negocio = coalesce(excluded.negocio, shangai.clientes.negocio),
         ciudad = coalesce(excluded.ciudad, shangai.clientes.ciudad),
         provincia = coalesce(excluded.provincia, shangai.clientes.provincia)
  returning id into v_cliente_id;

  update shangai.pedidos
     set subtotal = v_subtotal,
         descuento = v_descuento,
         costo_envio = v_envio,
         total = v_subtotal - v_descuento + coalesce(v_envio, 0),
         items_count = (v_carga ->> 'unidades')::int,
         cliente_id = v_cliente_id
   where id = v_pedido.id
  returning * into v_pedido;

  insert into shangai.pedido_eventos (pedido_id, tipo, estado, detalle, autor)
  values (v_pedido.id, 'creado', 'pendiente', 'Pedido recibido desde la tienda online', 'Cliente');

  return jsonb_build_object(
    'id', v_pedido.id,
    'numero', v_pedido.numero,
    'token', v_pedido.token,
    'subtotal', v_pedido.subtotal,
    'descuento', v_pedido.descuento,
    'costo_envio', v_pedido.costo_envio,
    'total', v_pedido.total,
    'metodo_pago', v_pedido.metodo_pago,
    'cliente', jsonb_build_object('nombre', v_pedido.cliente_nombre, 'email', v_pedido.cliente_email, 'telefono', v_pedido.cliente_telefono),
    'items', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'producto_id', i.producto_id, 'codigo', i.codigo, 'nombre', i.nombre, 'imagen', i.imagen,
        'precio_unitario', i.precio_unitario, 'cantidad', i.cantidad
      ) order by i.id), '[]'::jsonb)
      from shangai.pedido_items i where i.pedido_id = v_pedido.id
    )
  );
end;
$$;
