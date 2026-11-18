/**
 * URLs de imágenes de productos. Dos orígenes:
 * - Estáticas del catálogo inicial: "/fotos/<clave>/<n>.webp" servidas por el CDN de Vercel
 *   (sin cómputo, cache de un año), en 3 tamaños: <n>.webp (900px), -sm (400px), -xs (160px).
 * - Subidas desde el panel: "productos/<clave>/<n>.webp" en el bucket público `shangai`
 *   de Supabase (grande + "-sm").
 */

const BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/shangai/`;

export type TamImagen = "xs" | "sm" | "lg";

export const esEstatica = (ruta: string) => ruta.startsWith("/");
export const esDeStorage = (ruta: string) => !esEstatica(ruta) && !/^https?:\/\//.test(ruta);

export function urlImagen(ruta: string | null | undefined, tam: TamImagen = "lg"): string | null {
  if (!ruta) return null;
  if (/^https?:\/\//.test(ruta)) return ruta;
  const estatica = esEstatica(ruta);
  // Las del bucket no tienen versión -xs: usan la -sm.
  const sufijo = tam === "lg" ? "" : tam === "xs" && estatica ? "-xs" : "-sm";
  const r = sufijo ? ruta.replace(/\.webp$/, `${sufijo}.webp`) : ruta;
  return estatica ? r : BASE + r;
}

/** URL absoluta (para JSON-LD, Open Graph y Mercado Pago). */
export function urlImagenAbsoluta(ruta: string | null | undefined, tam: TamImagen, sitio: string): string | null {
  const u = urlImagen(ruta, tam);
  if (!u) return null;
  return u.startsWith("/") ? `${sitio.replace(/\/$/, "")}${u}` : u;
}

/** Ruta de miniatura derivada (para subir y borrar desde el panel). */
export const rutaMiniatura = (ruta: string) => ruta.replace(/\.webp$/, "-sm.webp");
