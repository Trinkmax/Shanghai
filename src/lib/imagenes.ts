/** URLs de imágenes del bucket público `shangai`.
 * En la base se guardan rutas ("productos/99099/1.webp"); la miniatura es "<n>-sm.webp". */

const BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/shangai/`;

export function urlImagen(ruta: string | null | undefined, tam: "sm" | "lg" = "lg"): string | null {
  if (!ruta) return null;
  if (/^https?:\/\//.test(ruta)) return ruta;
  const r = tam === "sm" ? ruta.replace(/\.webp$/, "-sm.webp") : ruta;
  return BASE + r;
}

/** Ruta de miniatura derivada (para subir desde el panel). */
export const rutaMiniatura = (ruta: string) => ruta.replace(/\.webp$/, "-sm.webp");
