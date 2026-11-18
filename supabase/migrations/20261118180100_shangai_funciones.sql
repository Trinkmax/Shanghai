-- =============================================================================
-- Shangai Center · funciones de negocio
-- Reglas: search_path vacío, nombres calificados, EXECUTE revocado de PUBLIC y
-- otorgado solo a quien corresponde. Los mensajes de error (P0001) están en
-- castellano y se muestran tal cual en la tienda y el panel.
-- =============================================================================

-- $ 120.000 (formato es-AR, sin centavos)
create or replace function shangai_private.pesos(p numeric)
returns text
language sql
immutable
set search_path = ''
as $$
  select '$ ' || replace(to_char(round(coalesce(p, 0)), 'FM999,999,999,990'), ',', '.')
$$;

create or replace function shangai_private.texto_estado(p_estado text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_estado
    when 'pendiente' then 'Pedido recibido'
    when 'confirmado' then 'Pedido confirmado'
    when 'preparando' then 'Estamos preparando tu pedido'
    when 'listo' then 'Listo para retirar o despachar'
    when 'enviado' then 'Pedido despachado'
    when 'entregado' then 'Pedido entregado'
    when 'cancelado' then 'Pedido cancelado'
    else p_estado
  end
$$;

create or replace function shangai_private.texto_pago(p_estado_pago text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_estado_pago
    when 'aprobado' then 'Pago acreditado'
    when 'en_proceso' then 'Pago en revisión'
    when 'pendiente' then 'Pago pendiente'
    when 'rechazado' then 'El pago fue rechazado'
    when 'reembolsado' then 'Pago devuelto'
    when 'cancelado' then 'Pago cancelado'
    else p_estado_pago
  end
$$;

-- Suma o resta las unidades vendidas y el historial del cliente (signo +1 / -1).
create or replace function shangai_private.contabilizar_ventas(p_pedido uuid, p_signo int)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update shangai.productos pr
     set vendidos = greatest(0, pr.vendidos + p_signo * x.cant)
    from (
      select i.producto_id, sum(i.cantidad)::int as cant
        from shangai.pedido_items i
       where i.pedido_id = p_pedido and i.producto_id is not null
       group by i.producto_id
    ) x
   where pr.id = x.producto_id;

  update shangai.clientes c
     set pedidos_count = greatest(0, c.pedidos_count + p_signo),
         total_comprado = greatest(0, c.total_comprado + p_signo * p.total),
         ultimo_pedido_en = case
           when p_signo > 0 then greatest(coalesce(c.ultimo_pedido_en, p.creado_en), p.creado_en)
           else c.ultimo_pedido_en
         end
    from shangai.pedidos p
   where p.id = p_pedido and c.id = p.cliente_id;

  update shangai.pedidos set ventas_contabilizadas = (p_signo > 0) where id = p_pedido;
end;
$$;

-- Repone el stock de un pedido (solo productos que controlan stock).
create or replace function shangai_private.reponer_stock(p_pedido uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update shangai.productos pr
     set stock = pr.stock + x.cant
    from (
      select i.producto_id, sum(i.cantidad)::int as cant
        from shangai.pedido_items i
       where i.pedido_id = p_pedido and i.producto_id is not null
       group by i.producto_id
    ) x
   where pr.id = x.producto_id and pr.stock is not null
$$;

revoke all on function shangai_private.pesos(numeric) from public;
revoke all on function shangai_private.texto_estado(text) from public;
revoke all on function shangai_private.texto_pago(text) from public;
revoke all on function shangai_private.contabilizar_ventas(uuid, int) from public;
revoke all on function shangai_private.reponer_stock(uuid) from public;

-- =============================================================================
-- Agrega ítems a un pedido validando producto, mínimo por producto y stock.
-- Devuelve {subtotal, unidades}. Uso interno de crear_pedido / venta de mostrador.
-- =============================================================================
create or replace function shangai_private.cargar_items(p_pedido uuid, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fila record;
  v_prod shangai.productos;
  v_precio numeric;
  v_subtotal numeric := 0;
  v_unidades int := 0;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'El pedido está vacío: agregá al menos un producto.' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_items) > 400 then
    raise exception 'El pedido tiene demasiados renglones. Dividilo en dos.' using errcode = 'P0001';
  end if;

  for v_fila in
    select x.producto_id, sum(x.cantidad)::int as cantidad
      from jsonb_to_recordset(p_items) as x (producto_id uuid, cantidad int)
     group by x.producto_id
  loop
    if v_fila.producto_id is null or v_fila.cantidad is null or v_fila.cantidad < 1 or v_fila.cantidad > 100000 then
      raise exception 'Hay una cantidad inválida en el pedido.' using errcode = 'P0001';
    end if;

    select * into v_prod from shangai.productos where id = v_fila.producto_id and activo for update;
    if not found then
      raise exception 'Uno de los productos ya no está disponible. Revisá tu carrito.' using errcode = 'P0001';
    end if;
    if v_fila.cantidad < v_prod.cantidad_minima then
      raise exception '% se vende de a % unidades como mínimo.', v_prod.nombre, v_prod.cantidad_minima using errcode = 'P0001';
    end if;
    if v_prod.stock is not null then
      if v_prod.stock < v_fila.cantidad then
        if v_prod.stock = 0 then
          raise exception '% se agotó. Quitalo del carrito para seguir.', v_prod.nombre using errcode = 'P0001';
        end if;
        raise exception 'Solo quedan % unidades de %.', v_prod.stock, v_prod.nombre using errcode = 'P0001';
      end if;
      update shangai.productos set stock = stock - v_fila.cantidad where id = v_prod.id;
    end if;

    v_precio := shangai_private.precio_vigente(v_prod.precio, v_prod.precio_oferta, v_prod.oferta_hasta);
    insert into shangai.pedido_items (pedido_id, producto_id, codigo, nombre, imagen, precio_unitario, cantidad, subtotal)
    values (p_pedido, v_prod.id, v_prod.codigo, v_prod.nombre, v_prod.imagenes[1], v_precio, v_fila.cantidad, v_precio * v_fila.cantidad);

    v_subtotal := v_subtotal + v_precio * v_fila.cantidad;
    v_unidades := v_unidades + v_fila.cantidad;
  end loop;

  return jsonb_build_object('subtotal', v_subtotal, 'unidades', v_unidades);
end;
$$;
revoke all on function shangai_private.cargar_items(uuid, jsonb) from public;

-- =============================================================================
-- crear_pedido: pedido de la tienda online. Lo llama SOLO la Edge Function
-- shangai-checkout (service role). Precios, mínimo, stock y envío se calculan acá.
-- =============================================================================
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
begin
  select * into v_conf from shangai.configuracion where id;

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
revoke all on function shangai.crear_pedido(jsonb) from public, anon, authenticated;
grant execute on function shangai.crear_pedido(jsonb) to service_role;

-- Guarda la preferencia de Mercado Pago creada para el pedido (service role).
create or replace function shangai.guardar_preferencia(p_pedido uuid, p_preference_id text, p_init_point text)
returns void
language sql
security definer
set search_path = ''
as $$
  update shangai.pedidos
     set mp_preference_id = p_preference_id, mp_init_point = p_init_point
   where id = p_pedido
$$;
revoke all on function shangai.guardar_preferencia(uuid, text, text) from public, anon, authenticated;
grant execute on function shangai.guardar_preferencia(uuid, text, text) to service_role;

-- Datos para reintentar el pago de un pedido pendiente (service role, desde shangai-checkout).
create or replace function shangai.pedido_para_pago(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id, 'numero', p.numero, 'token', p.token, 'estado', p.estado, 'estado_pago', p.estado_pago,
    'metodo_pago', p.metodo_pago, 'total', p.total, 'costo_envio', p.costo_envio, 'descuento', p.descuento,
    'cliente', jsonb_build_object('nombre', p.cliente_nombre, 'email', p.cliente_email, 'telefono', p.cliente_telefono),
    'items', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'producto_id', i.producto_id, 'codigo', i.codigo, 'nombre', i.nombre, 'imagen', i.imagen,
        'precio_unitario', i.precio_unitario, 'cantidad', i.cantidad
      ) order by i.id), '[]'::jsonb)
      from shangai.pedido_items i where i.pedido_id = p.id
    )
  )
  from shangai.pedidos p where p.token = p_token
$$;
revoke all on function shangai.pedido_para_pago(uuid) from public, anon, authenticated;
grant execute on function shangai.pedido_para_pago(uuid) to service_role;

-- =============================================================================
-- pedido_publico: seguimiento por link (token imposible de adivinar).
-- =============================================================================
create or replace function shangai.pedido_publico(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'numero', p.numero,
    'estado', p.estado,
    'estado_pago', p.estado_pago,
    'metodo_pago', p.metodo_pago,
    'canal', p.canal,
    'entrega_metodo', p.entrega_metodo,
    'entrega_nombre', p.entrega_nombre,
    'entrega_direccion', p.entrega_direccion,
    'cliente_nombre', p.cliente_nombre,
    'cliente_email', p.cliente_email,
    'subtotal', p.subtotal,
    'descuento', p.descuento,
    'costo_envio', p.costo_envio,
    'total', p.total,
    'items_count', p.items_count,
    'notas', p.notas,
    'creado_en', p.creado_en,
    'pagado_en', p.pagado_en,
    'puede_pagar', (p.metodo_pago = 'mercadopago' and p.estado_pago in ('pendiente', 'rechazado', 'cancelado') and p.estado = 'pendiente'),
    'items', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'producto_id', i.producto_id, 'codigo', i.codigo, 'nombre', i.nombre, 'imagen', i.imagen,
        'precio_unitario', i.precio_unitario, 'cantidad', i.cantidad, 'subtotal', i.subtotal
      ) order by i.id), '[]'::jsonb)
      from shangai.pedido_items i where i.pedido_id = p.id
    ),
    'eventos', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'tipo', e.tipo, 'estado', e.estado, 'detalle', e.detalle, 'creado_en', e.creado_en
      ) order by e.creado_en, e.id), '[]'::jsonb)
      from shangai.pedido_eventos e where e.pedido_id = p.id and e.tipo <> 'nota'
    )
  )
  from shangai.pedidos p
  where p.token = p_token
$$;
revoke all on function shangai.pedido_publico(uuid) from public;
grant execute on function shangai.pedido_publico(uuid) to anon, authenticated, service_role;

-- =============================================================================
-- actualizar_pedido: cambios del personal (estado, pago manual, notas internas).
-- =============================================================================
create or replace function shangai.actualizar_pedido(
  p_pedido uuid,
  p_estado text default null,
  p_estado_pago text default null,
  p_nota text default null
)
returns shangai.pedidos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rol text := shangai_private.rol_actual();
  v_autor text;
  v_p shangai.pedidos;
begin
  if v_rol is null then
    raise exception 'No tenés permiso para modificar pedidos.' using errcode = '42501';
  end if;
  select nombre into v_autor from shangai.personal where id = (select auth.uid());

  select * into v_p from shangai.pedidos where id = p_pedido for update;
  if not found then
    raise exception 'No encontramos ese pedido.' using errcode = 'P0001';
  end if;

  if p_estado is not null and p_estado <> v_p.estado then
    if p_estado not in ('pendiente', 'confirmado', 'preparando', 'listo', 'enviado', 'entregado', 'cancelado') then
      raise exception 'Estado inválido.' using errcode = 'P0001';
    end if;
    if v_p.estado = 'cancelado' then
      raise exception 'El pedido está cancelado: ya no se puede cambiar.' using errcode = 'P0001';
    end if;
    if p_estado = 'cancelado' then
      perform shangai_private.reponer_stock(v_p.id);
      if v_p.ventas_contabilizadas then
        perform shangai_private.contabilizar_ventas(v_p.id, -1);
      end if;
    elsif p_estado = 'pendiente' then
      if v_p.ventas_contabilizadas then
        perform shangai_private.contabilizar_ventas(v_p.id, -1);
      end if;
    elsif not v_p.ventas_contabilizadas then
      perform shangai_private.contabilizar_ventas(v_p.id, 1);
    end if;

    update shangai.pedidos set estado = p_estado where id = v_p.id;
    insert into shangai.pedido_eventos (pedido_id, tipo, estado, detalle, autor_id, autor)
    values (v_p.id, 'estado', p_estado, shangai_private.texto_estado(p_estado), (select auth.uid()), v_autor);
    select * into v_p from shangai.pedidos where id = v_p.id;
  end if;

  if p_estado_pago is not null and p_estado_pago <> v_p.estado_pago then
    if p_estado_pago not in ('pendiente', 'en_proceso', 'aprobado', 'rechazado', 'reembolsado', 'cancelado') then
      raise exception 'Estado de pago inválido.' using errcode = 'P0001';
    end if;
    update shangai.pedidos
       set estado_pago = p_estado_pago,
           pagado_en = case when p_estado_pago = 'aprobado' then coalesce(pagado_en, now()) else pagado_en end
     where id = v_p.id;
    insert into shangai.pedido_eventos (pedido_id, tipo, detalle, autor_id, autor)
    values (v_p.id, 'pago', shangai_private.texto_pago(p_estado_pago), (select auth.uid()), v_autor);

    if p_estado_pago = 'aprobado' and v_p.estado = 'pendiente' then
      update shangai.pedidos set estado = 'confirmado' where id = v_p.id;
      insert into shangai.pedido_eventos (pedido_id, tipo, estado, detalle, autor_id, autor)
      values (v_p.id, 'estado', 'confirmado', shangai_private.texto_estado('confirmado'), (select auth.uid()), v_autor);
      if not v_p.ventas_contabilizadas then
        perform shangai_private.contabilizar_ventas(v_p.id, 1);
      end if;
    end if;
    select * into v_p from shangai.pedidos where id = v_p.id;
  end if;

  if p_nota is not null and btrim(p_nota) <> '' then
    insert into shangai.pedido_eventos (pedido_id, tipo, detalle, autor_id, autor)
    values (v_p.id, 'nota', left(btrim(p_nota), 1000), (select auth.uid()), v_autor);
  end if;

  return v_p;
end;
$$;
revoke all on function shangai.actualizar_pedido(uuid, text, text, text) from public, anon;
grant execute on function shangai.actualizar_pedido(uuid, text, text, text) to authenticated;

-- =============================================================================
-- registrar_pago: notificación de Mercado Pago (service role, desde el webhook).
-- =============================================================================
create or replace function shangai.registrar_pago(
  p_pedido uuid,
  p_referencia text,
  p_estado text,
  p_detalle text,
  p_monto numeric,
  p_medio text,
  p_cuotas int,
  p_datos jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_p shangai.pedidos;
  v_estado text;
begin
  select * into v_p from shangai.pedidos where id = p_pedido for update;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'pedido_inexistente');
  end if;

  insert into shangai.pagos (pedido_id, proveedor, referencia, estado, estado_detalle, monto, medio, cuotas, datos)
  values (p_pedido, 'mercadopago', p_referencia, p_estado, p_detalle, p_monto, p_medio, p_cuotas, p_datos)
  on conflict (proveedor, referencia) do update
     set estado = excluded.estado,
         estado_detalle = excluded.estado_detalle,
         monto = excluded.monto,
         medio = excluded.medio,
         cuotas = excluded.cuotas,
         datos = excluded.datos;

  v_estado := case p_estado
    when 'approved' then 'aprobado'
    when 'authorized' then 'en_proceso'
    when 'in_process' then 'en_proceso'
    when 'in_mediation' then 'en_proceso'
    when 'pending' then 'pendiente'
    when 'rejected' then 'rechazado'
    when 'cancelled' then 'cancelado'
    when 'refunded' then 'reembolsado'
    when 'charged_back' then 'reembolsado'
    else 'pendiente'
  end;

  -- Un intento rechazado posterior no pisa un pago ya acreditado con otra referencia.
  if v_p.estado_pago = 'aprobado' and v_estado <> 'reembolsado'
     and v_p.mp_payment_id is not null and v_p.mp_payment_id <> p_referencia then
    return jsonb_build_object('ok', true, 'sin_cambios', true);
  end if;

  -- Monto menor al total: no se aprueba automáticamente.
  if v_estado = 'aprobado' and p_monto is not null and p_monto + 1 < v_p.total then
    v_estado := 'en_proceso';
    insert into shangai.pedido_eventos (pedido_id, tipo, detalle, autor)
    values (p_pedido, 'nota', 'Mercado Pago informó un monto (' || shangai_private.pesos(p_monto) || ') menor al total. Revisalo antes de confirmar.', 'Mercado Pago');
  end if;

  if v_estado is distinct from v_p.estado_pago then
    update shangai.pedidos
       set estado_pago = v_estado,
           mp_payment_id = p_referencia,
           pagado_en = case when v_estado = 'aprobado' then coalesce(pagado_en, now()) else pagado_en end
     where id = p_pedido;
    insert into shangai.pedido_eventos (pedido_id, tipo, detalle, autor)
    values (p_pedido, 'pago', shangai_private.texto_pago(v_estado), 'Mercado Pago');

    if v_estado = 'aprobado' and v_p.estado = 'pendiente' then
      update shangai.pedidos set estado = 'confirmado' where id = p_pedido;
      insert into shangai.pedido_eventos (pedido_id, tipo, estado, detalle, autor)
      values (p_pedido, 'estado', 'confirmado', 'Pago acreditado: pedido confirmado', 'Mercado Pago');
      if not v_p.ventas_contabilizadas then
        perform shangai_private.contabilizar_ventas(p_pedido, 1);
      end if;
    end if;
  end if;

  return jsonb_build_object('ok', true, 'estado_pago', v_estado);
end;
$$;
revoke all on function shangai.registrar_pago(uuid, text, text, text, numeric, text, int, jsonb) from public, anon, authenticated;
grant execute on function shangai.registrar_pago(uuid, text, text, text, numeric, text, int, jsonb) to service_role;

-- =============================================================================
-- crear_venta_mostrador: venta en el local (cualquier miembro activo del equipo).
-- =============================================================================
create or replace function shangai.crear_venta_mostrador(p_datos jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rol text := shangai_private.rol_actual();
  v_autor text;
  v_metodo text := coalesce(p_datos ->> 'metodo_pago', 'efectivo');
  v_cliente jsonb := coalesce(p_datos -> 'cliente', '{}'::jsonb);
  v_nombre text := nullif(btrim(coalesce(v_cliente ->> 'nombre', '')), '');
  v_tel text := regexp_replace(coalesce(v_cliente ->> 'telefono', ''), '\D', '', 'g');
  v_descuento numeric := greatest(0, coalesce((p_datos ->> 'descuento')::numeric, 0));
  v_pedido shangai.pedidos;
  v_carga jsonb;
  v_subtotal numeric;
  v_cliente_id uuid;
begin
  if v_rol is null then
    raise exception 'No tenés permiso para registrar ventas.' using errcode = '42501';
  end if;
  if v_metodo not in ('efectivo', 'transferencia', 'tarjeta', 'mercadopago') then
    raise exception 'Medio de pago inválido.' using errcode = 'P0001';
  end if;
  select nombre into v_autor from shangai.personal where id = (select auth.uid());

  insert into shangai.pedidos (
    canal, estado, estado_pago, metodo_pago, cliente_nombre, cliente_telefono, entrega_metodo, entrega_nombre,
    notas, costo_envio, pagado_en, creado_por
  ) values (
    'mostrador', 'entregado', 'aprobado', v_metodo, coalesce(v_nombre, 'Cliente de mostrador'),
    v_tel, 'retiro', 'Venta en el local',
    nullif(left(btrim(coalesce(p_datos ->> 'notas', '')), 1000), ''), 0, now(), (select auth.uid())
  ) returning * into v_pedido;

  v_carga := shangai_private.cargar_items(v_pedido.id, p_datos -> 'items');
  v_subtotal := (v_carga ->> 'subtotal')::numeric;
  v_descuento := least(v_descuento, v_subtotal);

  if char_length(v_tel) >= 8 then
    insert into shangai.clientes (nombre, telefono)
    values (coalesce(v_nombre, 'Cliente de mostrador'), v_tel)
    on conflict (telefono) where telefono is not null and telefono <> '' do update
       set nombre = coalesce(nullif(excluded.nombre, 'Cliente de mostrador'), shangai.clientes.nombre)
    returning id into v_cliente_id;
  end if;

  update shangai.pedidos
     set subtotal = v_subtotal, descuento = v_descuento, total = v_subtotal - v_descuento,
         items_count = (v_carga ->> 'unidades')::int, cliente_id = v_cliente_id
   where id = v_pedido.id
  returning * into v_pedido;

  insert into shangai.pedido_eventos (pedido_id, tipo, estado, detalle, autor_id, autor)
  values (v_pedido.id, 'creado', 'entregado', 'Venta registrada en el local', (select auth.uid()), v_autor);

  perform shangai_private.contabilizar_ventas(v_pedido.id, 1);

  return jsonb_build_object('id', v_pedido.id, 'numero', v_pedido.numero, 'total', v_pedido.total, 'token', v_pedido.token);
end;
$$;
revoke all on function shangai.crear_venta_mostrador(jsonb) from public, anon;
grant execute on function shangai.crear_venta_mostrador(jsonb) to authenticated;

-- =============================================================================
-- resumen_ventas: tablero del panel (dueño/encargado).
-- =============================================================================
create or replace function shangai.resumen_ventas(p_desde timestamptz, p_hasta timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_res jsonb;
begin
  if not shangai_private.tiene_rol(array['dueno', 'encargado']) then
    raise exception 'Solo el dueño o el encargado ven los números de ventas.' using errcode = '42501';
  end if;

  with ventas as (
    select p.* from shangai.pedidos p
     where p.ventas_contabilizadas and p.creado_en >= p_desde and p.creado_en < p_hasta
  ),
  dias as (
    select d::date as dia
      from generate_series(
        (p_desde at time zone 'America/Argentina/Cordoba')::date,
        ((p_hasta at time zone 'America/Argentina/Cordoba') - interval '1 second')::date,
        interval '1 day'
      ) d
  ),
  por_dia as (
    select dias.dia,
           coalesce(sum(v.total), 0) as total,
           count(v.id) as pedidos
      from dias
      left join ventas v on (v.creado_en at time zone 'America/Argentina/Cordoba')::date = dias.dia
     group by dias.dia
     order by dias.dia
  ),
  top as (
    select i.producto_id, i.nombre, i.codigo, max(i.imagen) as imagen,
           sum(i.cantidad)::int as unidades, sum(i.subtotal) as total
      from shangai.pedido_items i
      join ventas v on v.id = i.pedido_id
     group by i.producto_id, i.nombre, i.codigo
     order by unidades desc
     limit 8
  )
  select jsonb_build_object(
    'ventas', coalesce((select sum(total) from ventas), 0),
    'pedidos', (select count(*) from ventas),
    'unidades', coalesce((select sum(items_count) from ventas), 0),
    'ticket_promedio', coalesce((select round(avg(total)) from ventas), 0),
    'web', coalesce((select sum(total) from ventas where canal = 'web'), 0),
    'mostrador', coalesce((select sum(total) from ventas where canal = 'mostrador'), 0),
    'por_dia', coalesce((select jsonb_agg(jsonb_build_object('dia', dia, 'total', total, 'pedidos', pedidos) order by dia) from por_dia), '[]'::jsonb),
    'por_metodo', coalesce((select jsonb_object_agg(metodo_pago, total) from (select metodo_pago, sum(total) as total from ventas group by metodo_pago) m), '{}'::jsonb),
    'top', coalesce((select jsonb_agg(to_jsonb(top)) from top), '[]'::jsonb),
    'pendientes', (select count(*) from shangai.pedidos where estado in ('pendiente', 'confirmado', 'preparando', 'listo')),
    'sin_pagar', (select count(*) from shangai.pedidos where estado = 'pendiente' and estado_pago in ('pendiente', 'rechazado', 'en_proceso'))
  ) into v_res;

  return v_res;
end;
$$;
revoke all on function shangai.resumen_ventas(timestamptz, timestamptz) from public, anon;
grant execute on function shangai.resumen_ventas(timestamptz, timestamptz) to authenticated;

-- =============================================================================
-- Secretos (Vault). Solo service role: los usan las Edge Functions.
-- =============================================================================
create or replace function shangai.mp_guardar_credenciales(p_access_token text, p_webhook_secret text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  select id into v_id from vault.secrets where name = 'shangai_mp_access_token';
  if v_id is null then
    perform vault.create_secret(p_access_token, 'shangai_mp_access_token', 'Shangai Center: access token de Mercado Pago');
  else
    perform vault.update_secret(v_id, p_access_token);
  end if;

  if p_webhook_secret is not null then
    v_id := null;
    select id into v_id from vault.secrets where name = 'shangai_mp_webhook_secret';
    if v_id is null then
      perform vault.create_secret(p_webhook_secret, 'shangai_mp_webhook_secret', 'Shangai Center: clave secreta de webhooks de Mercado Pago');
    else
      perform vault.update_secret(v_id, p_webhook_secret);
    end if;
  end if;
end;
$$;

create or replace function shangai.mp_borrar_credenciales()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from vault.secrets where name in ('shangai_mp_access_token', 'shangai_mp_webhook_secret')
$$;

create or replace function shangai.mp_credenciales()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'access_token', (select decrypted_secret from vault.decrypted_secrets where name = 'shangai_mp_access_token'),
    'webhook_secret', (select decrypted_secret from vault.decrypted_secrets where name = 'shangai_mp_webhook_secret')
  )
$$;

create or replace function shangai.validar_codigo_inicial(p_codigo text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from vault.decrypted_secrets
     where name = 'shangai_codigo_inicial' and decrypted_secret = p_codigo
  ) and not exists (select 1 from shangai.personal where rol = 'dueno')
$$;

revoke all on function shangai.mp_guardar_credenciales(text, text) from public, anon, authenticated;
revoke all on function shangai.mp_borrar_credenciales() from public, anon, authenticated;
revoke all on function shangai.mp_credenciales() from public, anon, authenticated;
revoke all on function shangai.validar_codigo_inicial(text) from public, anon, authenticated;
grant execute on function shangai.mp_guardar_credenciales(text, text) to service_role;
grant execute on function shangai.mp_borrar_credenciales() to service_role;
grant execute on function shangai.mp_credenciales() to service_role;
grant execute on function shangai.validar_codigo_inicial(text) to service_role;
