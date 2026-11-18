/** Formato de moneda, números y fechas — es-AR en todo el sistema.
 * La fecha "de negocio" es la del huso de Córdoba: el server puede correr en UTC. */

export const TZ_AR = "America/Argentina/Cordoba";

const ars = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const arsConCentavos = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const numero = new Intl.NumberFormat("es-AR");

/** $ 1.234.567 — sin centavos cuando el monto es entero. */
export function formatARS(monto: number | string | null | undefined): string {
  const n = Number(monto ?? 0);
  return Number.isInteger(n) ? ars.format(n) : arsConCentavos.format(n);
}

/** Partes del precio para componerlo tipográficamente: { signo: "$", entero: "12.500" }. */
export function partesPrecio(monto: number | string | null | undefined) {
  const n = Math.round(Number(monto ?? 0));
  return { signo: "$", entero: numero.format(n) };
}

export function formatNumero(n: number | string | null | undefined): string {
  return numero.format(Number(n ?? 0));
}

const fechaCorta = new Intl.DateTimeFormat("es-AR", { timeZone: TZ_AR, day: "numeric", month: "short" });
const fechaLarga = new Intl.DateTimeFormat("es-AR", {
  timeZone: TZ_AR,
  weekday: "long",
  day: "numeric",
  month: "long",
});
const fechaHora = new Intl.DateTimeFormat("es-AR", {
  timeZone: TZ_AR,
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
const hora = new Intl.DateTimeFormat("es-AR", { timeZone: TZ_AR, hour: "2-digit", minute: "2-digit" });

export const formatFechaCorta = (d: string | Date) => fechaCorta.format(new Date(d)).replace(".", "");
export const formatFechaLarga = (d: string | Date) => fechaLarga.format(new Date(d));
export const formatFechaHora = (d: string | Date) => fechaHora.format(new Date(d)).replace(".", "");
export const formatHora = (d: string | Date) => hora.format(new Date(d));

/** "hace 5 min", "hace 2 h", "ayer", "12 nov" */
export function haceCuanto(d: string | Date, ahora = Date.now()): string {
  const ms = ahora - new Date(d).getTime();
  const min = Math.round(ms / 60000);
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  if (h < 48) return "ayer";
  return formatFechaCorta(d);
}

/** Teléfono para wa.me: solo dígitos, con 549 si es un celular argentino sin prefijo. */
export function telefonoWhatsApp(tel: string): string {
  const d = tel.replace(/\D/g, "");
  if (d.startsWith("54")) return d;
  if (d.length === 10) return `549${d}`;
  return d;
}

export function linkWhatsApp(tel: string, texto?: string): string {
  const base = `https://wa.me/${telefonoWhatsApp(tel)}`;
  return texto ? `${base}?text=${encodeURIComponent(texto)}` : base;
}

/** "3516061756" → "351 606-1756" (visual, sin perder dígitos) */
export function formatTelefono(tel: string): string {
  const d = tel.replace(/\D/g, "").replace(/^549?/, "");
  if (d.length === 10) return `${d.slice(0, 3)} ${d.slice(3, 6)}-${d.slice(6)}`;
  return tel;
}

/** Plural simple en castellano: plural(3, "unidad", "unidades") */
export function plural(n: number, uno: string, varios: string) {
  return `${formatNumero(n)} ${n === 1 ? uno : varios}`;
}
