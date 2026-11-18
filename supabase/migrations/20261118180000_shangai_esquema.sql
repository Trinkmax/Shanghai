-- =============================================================================
-- Shangai Center · esquema base
-- Proyecto Supabase compartido: todo vive en el schema propio `shangai`
-- (expuesto por la Data API) y los helpers internos en `shangai_private`
-- (NO expuesto). Misma convención que laceleste.
-- =============================================================================

create schema if not exists shangai;
create schema if not exists shangai_private;

comment on schema shangai is 'Shangai Center (importador mayorista, Córdoba): catálogo, pedidos, pagos y panel.';
comment on schema shangai_private is 'Helpers internos de Shangai Center (RLS, cálculos). No se expone por la API.';

grant usage on schema shangai to anon, authenticated, service_role;
grant usage on schema shangai_private to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Normalización para búsqueda (minúsculas y sin acentos). Inmutable a propósito
-- para poder usarla en una columna generada.
-- -----------------------------------------------------------------------------
create or replace function shangai_private.normalizar(t text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(t, '')))
$$;

-- Precio que se cobra hoy: la oferta si está vigente, si no el precio de lista.
create or replace function shangai_private.precio_vigente(p_precio numeric, p_oferta numeric, p_hasta timestamptz)
returns numeric
language sql
stable
set search_path = ''
as $$
  select case
    when p_oferta is not null and (p_hasta is null or p_hasta > now()) then p_oferta
    else p_precio
  end
$$;

-- =============================================================================
-- Personal (dueños y empleados). id = auth.users.id
-- =============================================================================
create table shangai.personal (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null check (char_length(btrim(nombre)) between 2 and 80),
  email text not null,
  rol text not null default 'vendedor' check (rol in ('dueno', 'encargado', 'vendedor')),
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
comment on table shangai.personal is 'Cuentas del panel. dueno: todo · encargado: catálogo, pedidos y ajustes de tienda · vendedor: pedidos y mostrador.';

-- Helpers de RLS (security definer: leen personal sin recursión de políticas).
create or replace function shangai_private.rol_actual()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.rol from shangai.personal p where p.id = (select auth.uid()) and p.activo
$$;

create or replace function shangai_private.es_personal()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from shangai.personal p where p.id = (select auth.uid()) and p.activo)
$$;

create or replace function shangai_private.tiene_rol(p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.rol from shangai.personal p where p.id = (select auth.uid()) and p.activo) = any (p_roles),
    false
  )
$$;

revoke all on function shangai_private.rol_actual() from public;
revoke all on function shangai_private.es_personal() from public;
revoke all on function shangai_private.tiene_rol(text[]) from public;
grant execute on function shangai_private.rol_actual() to anon, authenticated, service_role;
grant execute on function shangai_private.es_personal() to anon, authenticated, service_role;
grant execute on function shangai_private.tiene_rol(text[]) to anon, authenticated, service_role;
grant execute on function shangai_private.normalizar(text) to anon, authenticated, service_role;
grant execute on function shangai_private.precio_vigente(numeric, numeric, timestamptz) to anon, authenticated, service_role;

-- =============================================================================
-- Catálogo
-- =============================================================================
create table shangai.categorias (
  id bigint generated always as identity primary key,
  legacy_id int unique,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nombre text not null check (char_length(btrim(nombre)) between 2 and 60),
  descripcion text,
  icono text not null default 'Package',
  color text not null default 'indigo',
  orden int not null default 0,
  activa boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
comment on table shangai.categorias is 'Rubros del catálogo. legacy_id = id de rubro del sitio anterior (imposhangai.com).';
comment on column shangai.categorias.icono is 'Nombre de ícono de lucide-react (PascalCase).';
comment on column shangai.categorias.color is 'Clave de color del letrero (ver paleta en la app).';

create table shangai.productos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique check (char_length(btrim(codigo)) between 1 and 40),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nombre text not null check (char_length(btrim(nombre)) between 2 and 160),
  descripcion text,
  categoria_id bigint references shangai.categorias (id) on delete set null,
  precio numeric(12, 2) not null check (precio > 0),
  precio_oferta numeric(12, 2) check (precio_oferta is null or (precio_oferta > 0)),
  oferta_hasta timestamptz,
  imagenes text[] not null default '{}',
  stock int check (stock is null or stock >= 0),
  cantidad_minima int not null default 1 check (cantidad_minima between 1 and 10000),
  es_novedad boolean not null default false,
  destacado boolean not null default false,
  ranking_vendidos int check (ranking_vendidos is null or ranking_vendidos between 1 and 999),
  vendidos int not null default 0 check (vendidos >= 0),
  activo boolean not null default true,
  orden int not null default 0,
  busqueda text generated always as (shangai_private.normalizar(nombre || ' ' || codigo)) stored,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint productos_oferta_menor check (precio_oferta is null or precio_oferta < precio)
);
comment on table shangai.productos is 'Catálogo mayorista. precio = lista; precio_oferta (+ oferta_hasta opcional) = oferta vigente.';
comment on column shangai.productos.imagenes is 'Rutas dentro del bucket shangai (productos/<clave>/<n>.webp). La miniatura es <n>-sm.webp.';
comment on column shangai.productos.stock is 'null = no se controla stock (siempre disponible).';
comment on column shangai.productos.ranking_vendidos is 'Posición fijada a mano en "Más vendidos" (1 = primero). Sin fijar, ordena por vendidos.';
comment on column shangai.productos.vendidos is 'Unidades vendidas en pedidos confirmados (lo mantienen las funciones de pedidos).';

create index productos_categoria_idx on shangai.productos (categoria_id);
create index productos_busqueda_trgm on shangai.productos using gin (busqueda extensions.gin_trgm_ops);
create index productos_novedad_idx on shangai.productos (orden) where es_novedad and activo;
create index productos_oferta_idx on shangai.productos (oferta_hasta) where precio_oferta is not null;
create index productos_vendidos_idx on shangai.productos (ranking_vendidos nulls last, vendidos desc) where activo;

create table shangai.banners (
  id bigint generated always as identity primary key,
  titulo text not null check (char_length(btrim(titulo)) between 2 and 90),
  bajada text,
  cta_texto text,
  cta_href text,
  imagen text,
  tono text not null default 'indigo' check (tono in ('indigo', 'ambar', 'noche', 'claro')),
  orden int not null default 0,
  activo boolean not null default true,
  desde timestamptz,
  hasta timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
comment on table shangai.banners is 'Carteles de la portada (vidriera). imagen = ruta en el bucket shangai.';

-- =============================================================================
-- Configuración de la tienda (fila única)
-- =============================================================================
create table shangai.configuracion (
  id boolean primary key default true check (id),
  nombre_tienda text not null default 'Shangai Center',
  descripcion text not null default 'Importador mayorista',
  whatsapp text not null default '5493516061756',
  telefono text,
  email text,
  direccion text not null default 'Entre Ríos 258',
  ciudad text not null default 'Córdoba Capital',
  mapa_url text,
  instagram text default 'imposhangai',
  facebook text,
  horarios jsonb not null default '[]'::jsonb,
  compra_minima numeric(12, 2) not null default 120000 check (compra_minima >= 0),
  anuncio text,
  envios jsonb not null default '[]'::jsonb,
  pago_mercadopago boolean not null default true,
  pago_transferencia boolean not null default true,
  pago_efectivo boolean not null default true,
  descuento_transferencia numeric(5, 2) not null default 0 check (descuento_transferencia between 0 and 50),
  transferencia_datos jsonb not null default '{"titular": "", "banco": "", "cbu": "", "alias": "", "cuit": ""}'::jsonb,
  mp_conectado boolean not null default false,
  actualizado_en timestamptz not null default now()
);
comment on table shangai.configuracion is 'Datos públicos de la tienda. mp_conectado lo mantiene la Edge Function shangai-mp (service role).';
comment on column shangai.configuracion.horarios is '[{"dia":1,"abre":"09:00","cierra":"18:00"}] · dia 0 = domingo. Vacío = no se muestran.';
comment on column shangai.configuracion.envios is '[{"id":"retiro"|"envio_local"|"envio_interior","nombre","detalle","precio":number|null,"gratis_desde":number|null,"activo":bool}] · precio null = a coordinar.';

-- Estado de la conexión con Mercado Pago (sin secretos: el access token vive en Vault).
create table shangai.mercadopago (
  id boolean primary key default true check (id),
  conectado boolean not null default false,
  public_key text,
  cuenta jsonb,
  modo text check (modo in ('produccion', 'prueba')),
  webhook_secreto boolean not null default false,
  conectado_en timestamptz,
  conectado_por uuid references shangai.personal (id) on delete set null,
  ultimo_error text,
  actualizado_en timestamptz not null default now()
);
create index mercadopago_conectado_por_idx on shangai.mercadopago (conectado_por);
comment on table shangai.mercadopago is 'Conexión con Mercado Pago. Solo la escribe la Edge Function shangai-mp. El access token está en vault.secrets (shangai_mp_access_token).';

-- =============================================================================
-- Clientes y pedidos
-- =============================================================================
create table shangai.clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text,
  email text,
  documento text,
  negocio text,
  ciudad text,
  provincia text,
  notas text,
  pedidos_count int not null default 0,
  total_comprado numeric(14, 2) not null default 0,
  ultimo_pedido_en timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create unique index clientes_telefono_key on shangai.clientes (telefono) where telefono is not null and telefono <> '';
comment on table shangai.clientes is 'Clientes (se crean/actualizan solos al pedir, identificados por teléfono).';

create table shangai.pedidos (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity (start with 1001) unique,
  token uuid not null default gen_random_uuid() unique,
  canal text not null default 'web' check (canal in ('web', 'mostrador', 'whatsapp')),
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'confirmado', 'preparando', 'listo', 'enviado', 'entregado', 'cancelado')),
  estado_pago text not null default 'pendiente'
    check (estado_pago in ('pendiente', 'en_proceso', 'aprobado', 'rechazado', 'reembolsado', 'cancelado')),
  metodo_pago text not null check (metodo_pago in ('mercadopago', 'transferencia', 'efectivo', 'tarjeta')),
  cliente_id uuid references shangai.clientes (id) on delete set null,
  cliente_nombre text not null,
  cliente_telefono text not null default '',
  cliente_email text,
  cliente_documento text,
  cliente_negocio text,
  entrega_metodo text not null check (entrega_metodo in ('retiro', 'envio_local', 'envio_interior')),
  entrega_nombre text not null,
  entrega_direccion jsonb,
  notas text,
  subtotal numeric(14, 2) not null default 0,
  descuento numeric(14, 2) not null default 0,
  costo_envio numeric(14, 2),
  total numeric(14, 2) not null default 0,
  items_count int not null default 0,
  mp_preference_id text,
  mp_init_point text,
  mp_payment_id text,
  pagado_en timestamptz,
  ventas_contabilizadas boolean not null default false,
  creado_por uuid references shangai.personal (id) on delete set null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
comment on table shangai.pedidos is 'Pedidos web y ventas de mostrador. token = link público de seguimiento. costo_envio null = a coordinar.';

create index pedidos_creado_idx on shangai.pedidos (creado_en desc);
create index pedidos_estado_idx on shangai.pedidos (estado, creado_en desc);
create index pedidos_cliente_idx on shangai.pedidos (cliente_id);
create index pedidos_creado_por_idx on shangai.pedidos (creado_por);

create table shangai.pedido_items (
  id bigint generated always as identity primary key,
  pedido_id uuid not null references shangai.pedidos (id) on delete cascade,
  producto_id uuid references shangai.productos (id) on delete set null,
  codigo text not null,
  nombre text not null,
  imagen text,
  precio_unitario numeric(12, 2) not null,
  cantidad int not null check (cantidad > 0),
  subtotal numeric(14, 2) not null
);
create index pedido_items_pedido_idx on shangai.pedido_items (pedido_id);
create index pedido_items_producto_idx on shangai.pedido_items (producto_id);

create table shangai.pedido_eventos (
  id bigint generated always as identity primary key,
  pedido_id uuid not null references shangai.pedidos (id) on delete cascade,
  tipo text not null check (tipo in ('creado', 'estado', 'pago', 'nota')),
  estado text,
  detalle text,
  autor_id uuid references shangai.personal (id) on delete set null,
  autor text,
  creado_en timestamptz not null default now()
);
comment on table shangai.pedido_eventos is 'Historial del pedido. tipo nota = nota interna (no se muestra al cliente).';
create index pedido_eventos_pedido_idx on shangai.pedido_eventos (pedido_id, creado_en);
create index pedido_eventos_autor_idx on shangai.pedido_eventos (autor_id);

create table shangai.pagos (
  id bigint generated always as identity primary key,
  pedido_id uuid not null references shangai.pedidos (id) on delete cascade,
  proveedor text not null default 'mercadopago',
  referencia text not null,
  estado text not null,
  estado_detalle text,
  monto numeric(14, 2),
  medio text,
  cuotas int,
  datos jsonb,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (proveedor, referencia)
);
create index pagos_pedido_idx on shangai.pagos (pedido_id);

-- =============================================================================
-- actualizado_en automático
-- =============================================================================
create trigger personal_actualizado before update on shangai.personal
  for each row execute function extensions.moddatetime (actualizado_en);
create trigger categorias_actualizado before update on shangai.categorias
  for each row execute function extensions.moddatetime (actualizado_en);
create trigger productos_actualizado before update on shangai.productos
  for each row execute function extensions.moddatetime (actualizado_en);
create trigger banners_actualizado before update on shangai.banners
  for each row execute function extensions.moddatetime (actualizado_en);
create trigger configuracion_actualizado before update on shangai.configuracion
  for each row execute function extensions.moddatetime (actualizado_en);
create trigger mercadopago_actualizado before update on shangai.mercadopago
  for each row execute function extensions.moddatetime (actualizado_en);
create trigger clientes_actualizado before update on shangai.clientes
  for each row execute function extensions.moddatetime (actualizado_en);
create trigger pedidos_actualizado before update on shangai.pedidos
  for each row execute function extensions.moddatetime (actualizado_en);
create trigger pagos_actualizado before update on shangai.pagos
  for each row execute function extensions.moddatetime (actualizado_en);

-- =============================================================================
-- Permisos de tabla (la Data API) + RLS
-- =============================================================================
grant select on shangai.categorias, shangai.productos, shangai.banners, shangai.configuracion to anon, authenticated;
grant insert, update, delete on shangai.categorias, shangai.productos, shangai.banners to authenticated;
grant update (
  nombre_tienda, descripcion, whatsapp, telefono, email, direccion, ciudad, mapa_url, instagram, facebook,
  horarios, compra_minima, anuncio, envios, pago_mercadopago, pago_transferencia, pago_efectivo,
  descuento_transferencia, transferencia_datos
) on shangai.configuracion to authenticated;
grant select on shangai.personal, shangai.clientes, shangai.pedidos, shangai.pedido_items,
  shangai.pedido_eventos, shangai.pagos, shangai.mercadopago to authenticated;
grant update (nombre, telefono, email, documento, negocio, ciudad, provincia, notas) on shangai.clientes to authenticated;

grant all on all tables in schema shangai to service_role;
grant usage, select on all sequences in schema shangai to service_role;

alter table shangai.personal enable row level security;
alter table shangai.categorias enable row level security;
alter table shangai.productos enable row level security;
alter table shangai.banners enable row level security;
alter table shangai.configuracion enable row level security;
alter table shangai.mercadopago enable row level security;
alter table shangai.clientes enable row level security;
alter table shangai.pedidos enable row level security;
alter table shangai.pedido_items enable row level security;
alter table shangai.pedido_eventos enable row level security;
alter table shangai.pagos enable row level security;

-- personal: el equipo se ve entre sí; las altas/bajas pasan por la Edge Function.
create policy "personal: el equipo se ve" on shangai.personal
  for select to authenticated using ((select shangai_private.es_personal()));

-- categorías
create policy "categorias: lectura" on shangai.categorias
  for select to anon, authenticated using (activa or (select shangai_private.es_personal()));
create policy "categorias: alta" on shangai.categorias
  for insert to authenticated with check ((select shangai_private.tiene_rol(array['dueno', 'encargado'])));
create policy "categorias: edición" on shangai.categorias
  for update to authenticated using ((select shangai_private.tiene_rol(array['dueno', 'encargado'])))
  with check ((select shangai_private.tiene_rol(array['dueno', 'encargado'])));
create policy "categorias: baja" on shangai.categorias
  for delete to authenticated using ((select shangai_private.tiene_rol(array['dueno', 'encargado'])));

-- productos
create policy "productos: lectura" on shangai.productos
  for select to anon, authenticated using (activo or (select shangai_private.es_personal()));
create policy "productos: alta" on shangai.productos
  for insert to authenticated with check ((select shangai_private.tiene_rol(array['dueno', 'encargado'])));
create policy "productos: edición" on shangai.productos
  for update to authenticated using ((select shangai_private.tiene_rol(array['dueno', 'encargado'])))
  with check ((select shangai_private.tiene_rol(array['dueno', 'encargado'])));
create policy "productos: baja" on shangai.productos
  for delete to authenticated using ((select shangai_private.tiene_rol(array['dueno', 'encargado'])));

-- banners
create policy "banners: lectura" on shangai.banners
  for select to anon, authenticated using (
    (activo and (desde is null or desde <= now()) and (hasta is null or hasta > now()))
    or (select shangai_private.es_personal())
  );
create policy "banners: alta" on shangai.banners
  for insert to authenticated with check ((select shangai_private.tiene_rol(array['dueno', 'encargado'])));
create policy "banners: edición" on shangai.banners
  for update to authenticated using ((select shangai_private.tiene_rol(array['dueno', 'encargado'])))
  with check ((select shangai_private.tiene_rol(array['dueno', 'encargado'])));
create policy "banners: baja" on shangai.banners
  for delete to authenticated using ((select shangai_private.tiene_rol(array['dueno', 'encargado'])));

-- configuración: pública para leer; dueño/encargado editan (columnas permitidas por GRANT).
create policy "configuracion: lectura" on shangai.configuracion
  for select to anon, authenticated using (true);
create policy "configuracion: edición" on shangai.configuracion
  for update to authenticated using ((select shangai_private.tiene_rol(array['dueno', 'encargado'])))
  with check ((select shangai_private.tiene_rol(array['dueno', 'encargado'])));

-- mercado pago (estado, sin secretos)
create policy "mercadopago: lectura" on shangai.mercadopago
  for select to authenticated using ((select shangai_private.tiene_rol(array['dueno', 'encargado'])));

-- clientes
create policy "clientes: lectura" on shangai.clientes
  for select to authenticated using ((select shangai_private.es_personal()));
create policy "clientes: edición" on shangai.clientes
  for update to authenticated using ((select shangai_private.es_personal()))
  with check ((select shangai_private.es_personal()));

-- pedidos y derivados: el personal los ve; las escrituras pasan por funciones.
create policy "pedidos: lectura" on shangai.pedidos
  for select to authenticated using ((select shangai_private.es_personal()));
create policy "pedido_items: lectura" on shangai.pedido_items
  for select to authenticated using ((select shangai_private.es_personal()));
create policy "pedido_eventos: lectura" on shangai.pedido_eventos
  for select to authenticated using ((select shangai_private.es_personal()));
create policy "pagos: lectura" on shangai.pagos
  for select to authenticated using ((select shangai_private.tiene_rol(array['dueno', 'encargado'])));
