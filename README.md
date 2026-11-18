# Shangai Center — tienda mayorista y panel

Tienda online + sistema de gestión para **Shangai Center** (importador mayorista, Entre Ríos 258, Córdoba).
Reemplaza el catálogo PHP de imposhangai.com.

- **Tienda** (`/`): catálogo de ~1.000 productos en 41 rubros, ofertas, más vendidos, novedades, búsqueda instantánea por nombre o código, pedido con medidor de compra mínima, checkout y seguimiento del pedido.
- **Panel** (`/panel`): pedidos en vivo, mostrador, productos, rubros, ofertas, ranking, portada, clientes, equipo, ajustes y conexión con Mercado Pago.

Stack: Next.js 16 (App Router, Cache Components, Turbopack) · Tailwind CSS v4 · Motion · Radix · Supabase (Postgres + Auth + Storage + Edge Functions) · Mercado Pago Checkout Pro · Vercel.

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # completar valores
npm run dev
```

### Variables de entorno (Vercel y local)

| Variable | Valor |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxpyblnhedtjtvbhljcy.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | clave publicable (`sb_publishable_…`) del proyecto |
| `NEXT_PUBLIC_SITIO_URL` | URL pública final (para SEO, sitemap y metadatos) |

No hay claves secretas en Next.js: todo lo privilegiado corre en Edge Functions con el service role.

Secreto opcional de Edge Functions (Supabase → Edge Functions → Secrets): `SHANGAI_SITIOS=https://tu-dominio.com` si el dominio no es `*.vercel.app` ni `imposhangai.com` (lista de orígenes válidos para volver desde Mercado Pago).

## Supabase

Proyecto compartido con otras apps: todo vive en el schema **`shangai`** (expuesto en la Data API agregándolo a `pgrst.db_schemas` del rol `authenticator`) y los helpers en **`shangai_private`** (no expuesto). Migraciones en `supabase/migrations/`.

- Tablas: `categorias`, `productos`, `banners`, `configuracion` (fila única), `mercadopago`, `clientes`, `pedidos`, `pedido_items`, `pedido_eventos`, `pagos`, `personal`.
- Roles del panel (`personal.rol`): `dueno` (todo), `encargado` (catálogo, pedidos, ajustes de tienda), `vendedor` (pedidos y mostrador).
- Funciones clave: `crear_pedido` (precios, mínimo, stock y envío calculados en la base), `pedido_publico` (seguimiento por link), `actualizar_pedido`, `registrar_pago`, `crear_venta_mostrador`, `resumen_ventas`.
- Secretos en **Vault**: `shangai_mp_access_token`, `shangai_mp_webhook_secret`, `shangai_codigo_inicial`.
- Imágenes: bucket público `shangai` (`productos/<codigo>/<n>.webp` + miniatura `<n>-sm.webp`).

### Edge Functions

| Función | Para qué |
| --- | --- |
| `shangai-checkout` | Crea pedidos de la tienda y la preferencia de Checkout Pro |
| `shangai-mp-webhook` | Recibe notificaciones de Mercado Pago, valida firma (si hay clave) y confirma el pago consultando la API |
| `shangai-mp` | Conectar / probar / desconectar la cuenta de Mercado Pago (dueño) |
| `shangai-personal` | Alta del primer dueño y gestión del equipo |

## Primer ingreso al panel

1. Entrar a `/panel/inicio`.
2. Cargar el **código inicial** (lo tiene el desarrollador; está en Vault como `shangai_codigo_inicial`), nombre, email y contraseña del dueño.
3. Desde *Equipo*, dar de alta al resto del personal.

## Mercado Pago

El dueño conecta su cuenta desde *Panel → Ajustes → Mercado Pago* pegando las **credenciales de producción** (Mercado Pago Developers → Tus integraciones → Credenciales). Cada pago envía su propia URL de notificación (`/functions/v1/shangai-mp-webhook`), así que no hace falta configurar webhooks a mano; si se configura la clave secreta de webhooks, se valida la firma.

## Datos iniciales

Importados de imposhangai.com el 18/11/2026: productos, códigos, precios, rubros, fotos y "Novedades" (con su orden). Las **ofertas** son las que el sitio marcaba como "(OFERTA)". El ranking de **Más vendidos** arranca con una selección inicial (posiciones 1–12) que el dueño debe ajustar; después se actualiza solo con las ventas confirmadas. **Horarios**, costos de envío y datos bancarios están vacíos a propósito: se cargan en *Ajustes*.

## Diseño

Ver `DESIGN.md` (sistema "Vidriera luminosa") y `PRODUCT.md`.
