/** Tipos y reglas de la tienda compartidas entre servidor y navegador. */
import type { EstadoPago, EstadoPedido, MetodoEntrega, MetodoPago } from "@/lib/database.types";
import { TZ_AR } from "@/lib/format";

/** Producto tal como lo usa la tienda (subset liviano de shangai.productos). */
export type ProductoTienda = {
  id: string;
  codigo: string;
  slug: string;
  nombre: string;
  precio: number;
  precio_oferta: number | null;
  oferta_hasta: string | null;
  en_oferta: boolean;
  imagenes: string[];
  stock: number | null;
  cantidad_minima: number;
  es_novedad: boolean;
  ranking_vendidos: number | null;
  vendidos: number;
  categoria_id: number | null;
};

export const COLUMNAS_PRODUCTO =
  "id, codigo, slug, nombre, precio, precio_oferta, oferta_hasta, en_oferta, imagenes, stock, cantidad_minima, es_novedad, ranking_vendidos, vendidos, categoria_id" as const;

export type Categoria = {
  id: number;
  slug: string;
  nombre: string;
  icono: string;
  color: string;
  orden: number;
  cantidad: number;
};

/** La oferta con precio está vigente (sin fecha o con fecha futura). */
export function ofertaVigente(p: Pick<ProductoTienda, "precio_oferta" | "oferta_hasta">, ahora = Date.now()) {
  return p.precio_oferta != null && (!p.oferta_hasta || new Date(p.oferta_hasta).getTime() > ahora);
}

/** Precio que se cobra hoy (misma regla que shangai_private.precio_vigente). */
export function precioVigente(p: Pick<ProductoTienda, "precio" | "precio_oferta" | "oferta_hasta">, ahora = Date.now()) {
  return ofertaVigente(p, ahora) ? Number(p.precio_oferta) : Number(p.precio);
}

export function descuentoPct(p: Pick<ProductoTienda, "precio" | "precio_oferta" | "oferta_hasta">) {
  if (!ofertaVigente(p)) return 0;
  return Math.round((1 - Number(p.precio_oferta) / Number(p.precio)) * 100);
}

export const esOferta = (p: Pick<ProductoTienda, "en_oferta" | "precio_oferta" | "oferta_hasta">) =>
  p.en_oferta || ofertaVigente(p);

export const agotado = (p: Pick<ProductoTienda, "stock">) => p.stock !== null && p.stock <= 0;

/** Producto con todo lo que depende de la hora ya resuelto (lo arma el servidor dentro de "use cache"). */
export type ProductoVista = ProductoTienda & {
  creado_en: string;
  destacado?: boolean;
  /** Precio que se cobra hoy. */
  precio_final: number;
  /** Precio de lista tachado, solo si hay oferta con precio vigente. */
  precio_lista: number | null;
  /** % de descuento (0 si no hay precio de oferta vigente). */
  descuento: number;
  /** Aparece en Ofertas (marcado a mano o con precio de oferta vigente). */
  oferta: boolean;
  agotado: boolean;
};

export function vistaDe(p: ProductoTienda & { creado_en?: string; destacado?: boolean }, ahora: number): ProductoVista {
  const vig = ofertaVigente(p, ahora);
  return {
    ...p,
    creado_en: p.creado_en ?? "",
    precio_final: vig ? Number(p.precio_oferta) : Number(p.precio),
    precio_lista: vig ? Number(p.precio) : null,
    descuento: vig ? Math.round((1 - Number(p.precio_oferta) / Number(p.precio)) * 100) : 0,
    oferta: p.en_oferta || vig,
    agotado: agotado(p),
  };
}

// ----------------------------------------------------------------------------
// Configuración pública
// ----------------------------------------------------------------------------
export type OpcionEnvio = {
  id: MetodoEntrega;
  nombre: string;
  detalle?: string;
  precio: number | null;
  gratis_desde?: number | null;
  activo: boolean;
};

export type Horario = { dia: number; abre: string; cierra: string };

export type DatosTransferencia = { titular: string; banco: string; cbu: string; alias: string; cuit: string };

export type ConfigTienda = {
  nombre_tienda: string;
  descripcion: string;
  whatsapp: string;
  telefono: string | null;
  email: string | null;
  direccion: string;
  ciudad: string;
  mapa_url: string | null;
  instagram: string | null;
  facebook: string | null;
  horarios: Horario[];
  compra_minima: number;
  anuncio: string | null;
  envios: OpcionEnvio[];
  pago_mercadopago: boolean;
  pago_transferencia: boolean;
  pago_efectivo: boolean;
  descuento_transferencia: number;
  transferencia_datos: DatosTransferencia;
  mp_conectado: boolean;
};

export const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
export const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function ahoraEnCordoba(ahora: Date) {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ_AR,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(ahora);
  const get = (t: string) => partes.find((p) => p.type === t)?.value ?? "";
  const dia = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { dia, minutos: Number(get("hour")) * 60 + Number(get("minute")) };
}
const aMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
};

export type EstadoLocal = { abierto: boolean; texto: string } | null;

/** "Abierto · cierra 18:00" / "Cerrado · abre mañana 9:00". null si no cargaron horarios. */
export function estadoLocal(horarios: Horario[] | null | undefined, ahora = new Date()): EstadoLocal {
  if (!horarios || horarios.length === 0) return null;
  const { dia, minutos } = ahoraEnCordoba(ahora);
  const hoy = horarios.filter((h) => h.dia === dia).sort((a, b) => aMin(a.abre) - aMin(b.abre));
  const ahoraAbierto = hoy.find((h) => minutos >= aMin(h.abre) && minutos < aMin(h.cierra));
  if (ahoraAbierto) return { abierto: true, texto: `Abierto · cierra ${ahoraAbierto.cierra}` };
  const masTarde = hoy.find((h) => aMin(h.abre) > minutos);
  if (masTarde) return { abierto: false, texto: `Cerrado · abre hoy ${masTarde.abre}` };
  for (let i = 1; i <= 7; i++) {
    const d = (dia + i) % 7;
    const prox = horarios.filter((h) => h.dia === d).sort((a, b) => aMin(a.abre) - aMin(b.abre))[0];
    if (prox) return { abierto: false, texto: `Cerrado · abre ${i === 1 ? "mañana" : DIAS[d]} ${prox.abre}` };
  }
  return { abierto: false, texto: "Cerrado" };
}

// ----------------------------------------------------------------------------
// Paleta de "acrílicos" de los rubros (letreros). texto = color del ícono encima.
// ----------------------------------------------------------------------------
export const ACRILICOS: Record<string, { fondo: string; suave: string; texto: string }> = {
  indigo: { fondo: "#5C63AA", suave: "#E8E9F6", texto: "#FFFFFF" },
  ambar: { fondo: "#F4B400", suave: "#FDF1CC", texto: "#2A2205" },
  mandarina: { fondo: "#EC6A2C", suave: "#FCE6DA", texto: "#FFFFFF" },
  coral: { fondo: "#E2504A", suave: "#FBE2E1", texto: "#FFFFFF" },
  magenta: { fondo: "#C13A84", suave: "#F7DDEB", texto: "#FFFFFF" },
  uva: { fondo: "#7446BC", suave: "#ECE3F8", texto: "#FFFFFF" },
  cielo: { fondo: "#2A7FCB", suave: "#DDEBF8", texto: "#FFFFFF" },
  turquesa: { fondo: "#0F8C89", suave: "#D7EFEE", texto: "#FFFFFF" },
  menta: { fondo: "#1F9467", suave: "#D9F0E6", texto: "#FFFFFF" },
  oliva: { fondo: "#6A8A22", suave: "#E8EFD6", texto: "#FFFFFF" },
  grafito: { fondo: "#454A61", suave: "#E4E5EB", texto: "#FFFFFF" },
};
export const acrilico = (clave: string | null | undefined) => ACRILICOS[clave ?? ""] ?? ACRILICOS.indigo;

// ----------------------------------------------------------------------------
// Textos de estados
// ----------------------------------------------------------------------------
export const TEXTO_ESTADO: Record<EstadoPedido, string> = {
  pendiente: "Recibido",
  confirmado: "Confirmado",
  preparando: "En preparación",
  listo: "Listo",
  enviado: "Despachado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export const TEXTO_PAGO: Record<EstadoPago, string> = {
  pendiente: "Pago pendiente",
  en_proceso: "Pago en revisión",
  aprobado: "Pagado",
  rechazado: "Pago rechazado",
  reembolsado: "Pago devuelto",
  cancelado: "Pago cancelado",
};

export const TEXTO_METODO_PAGO: Record<MetodoPago, string> = {
  mercadopago: "Mercado Pago",
  transferencia: "Transferencia",
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
};

export const PASOS_PEDIDO: EstadoPedido[] = ["pendiente", "confirmado", "preparando", "listo", "entregado"];
