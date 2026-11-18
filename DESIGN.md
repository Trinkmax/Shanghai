# Design

Mundo visual: **Vidriera luminosa**. La tienda es la vidriera del local de Entre Ríos 258 llevada a la web: un cartel de acrílico índigo retroiluminado, letras de vinilo sobre vidrio, productos exhibidos detrás del paño y calcos en la puerta. Rechaza la plantilla de marketplace (cabecera plana + carrusel + grilla de tarjetas con sombra).

## Color

Estrategia: índigo comprometido en las regiones "encendidas" (cartel, acción principal, medidor, pie), ámbar como vinilo de oferta, neutros fríos de vidrio y aluminio para todo lo demás. Tokens en `src/app/globals.css` (`@theme`).

| Rol | Token | Valor | Uso |
| --- | --- | --- | --- |
| Marca profundo | `marca-700` | `#372A84` | "SHANGAI" del logo, rótulos, cartel |
| Marca | `marca-500` | `#5C63AA` | "CENTER" + isotipo, foco, progreso |
| Tinta | `tinta` / `tinta-2` / `tinta-3` | `#16142C` / `#45435E` / `#615F7B` | texto (≥5,5:1 sobre blanco y vidrio) |
| Vidrio | `vidrio` / `vidrio-2` | `#F3F4F8` / `#E9EBF2` | fondo de página, superficies quietas |
| Aluminio | `aluminio` / `aluminio-2` | `#D8DBE5` / `#B5B9C9` | perfiles de 1px, bordes de campos |
| Vinilo oferta | `ambar` (+ `ambar-tinta`) | `#FFC21A` (+ `#3A2A00`) | ofertas, sección Ofertas (región completa) |
| Estados | `rojo`, `verde`, `wa` | `#CF3434`, `#13804A`, `#25D366` | error, éxito, WhatsApp |

Rubros: cada uno tiene un "acrílico" (`ACRILICOS` en `src/lib/tienda.ts`: indigo, ambar, mandarina, coral, magenta, uva, cielo, turquesa, menta, oliva, grafito) que solo se usa en su ficha de ícono y en el tinte del encabezado del rubro. Íconos blancos sobre acrílico ≥3:1 (ámbar lleva ícono oscuro).

## Tipografía

Una sola familia: **Archivo** (variable, ejes `wght` y `wdth`), autoalojada por `next/font`.

- `rotulo`: ancho 125, peso 800, versalitas, interlineado 0,95. Títulos de sección y de página (las letras de vinilo del cartel). Nunca para párrafos.
- `rotulo-medio`: ancho 112, peso 750, versalitas espaciadas. Etiquetas cortas dentro del cartel/pie.
- Texto: ancho 100, 400–600. Precios y códigos siempre `tabular` (`font-variant-numeric: tabular-nums`). El "$" del precio va chico y elevado (`<Precio>`).
- Sin etiquetas "kicker" sobre los títulos.

## Materiales y componentes

- **Cartel** (`.cartel` + `.cartel-luz`): acrílico índigo con difusor granulado, dos zonas de luz y brillo superior. Cabecera flotante (margen de 8–12px, radio 16px, sticky), botón principal, fichas numeradas, pie.
- **Vidriera** (`.vidriera` + `.vidriera-grilla`): marco de aluminio con productos separados por perfiles de 1px. No hay tarjetas con sombra en las grillas.
- **Paño de producto** (`TarjetaProducto`): foto con encuadre uniforme (el blanco sobrante se recorta y se re-centra al importar), calcos de vinilo arriba a la izquierda, favorito arriba a la derecha, nombre en 2 líneas, precio + código, y una fila de acción de alto fijo que pasa de "Agregar" a selector de cantidad sin mover la grilla.
- **Vinilos** (`.vinilo-*`): calcos autoadhesivos chicos (Oferta, −15%, Nuevo, Nº 1, Agotado). Máximo dos por producto.
- **Caja de progreso** (`CajaProgreso` / `MedidorMinimo`): pieza firma. La "S" del logo se dibuja a lo largo de su propio trazo (`pathLength=100`) según el avance hacia la compra mínima; al completarse se ilumina la cara superior de la caja. Aparece en el botón del pedido, la barra inferior, la puerta de la vidriera, el carrito, el checkout y la ficha de producto.
- **Calcos de puerta**: medios de pago y entrega reales (salen de la configuración).
- Campos (`.campo`): 48px de alto, borde aluminio, foco con halo índigo; errores en rojo debajo, en castellano y con la salida.

## Movimiento

Curvas: `--ease-out` `cubic-bezier(0.23,1,0.32,1)` para entradas/feedback, `--ease-drawer` para hojas. UI < 300ms.

- Presión: `scale(0.97)` en todo lo presionable (`presionable`).
- Encendido del cartel: el tubo titila y queda firme (1,1s, WAAPI sobre `.cartel-luz`), **una vez por sesión** y otra al alcanzar la compra mínima. Con movimiento reducido no se anima.
- Vuelo al carrito: solo el primer producto de la sesión (enseña dónde queda el pedido); después solo late el contador. Agregar es una acción de decenas de veces por pedido.
- Números de cantidad: rueda vertical de 160ms con desenfoque leve.
- Reflejo de vidrio: barrido diagonal al pasar el mouse por un paño (solo con puntero fino).
- Cajones/hojas: `vaul` (abajo en celular, a la derecha en escritorio); toasts con `sonner`.
- Buscador: sin animación de apertura (se usa mucho); resultados en cada tecla desde un índice local.

## Layout

- Contenedor máx. 1440px, márgenes 12/20/24px. Secciones separadas 64–96px.
- Celular primero: barra inferior tipo app (Inicio, Rubros, Buscar, Ofertas, Pedido con el total en vivo), filas deslizables con `snap`, barra fija de "Agregar" en la ficha.
- Escritorio: lateral de rubros en listados, resumen fijo en checkout y seguimiento.

## Estados

Esqueletos con brillo (`.esqueleto`), vacíos con el isotipo en aluminio + próxima acción, errores con "Reintentar". Foto faltante → isotipo en lugar de imagen rota.

## Panel

Modo "operar": mismos tokens, cartel en la cabecera del menú, vinilos como chips de estado, tablas y formularios densos y legibles. Sin decoración que compita con la tarea.
