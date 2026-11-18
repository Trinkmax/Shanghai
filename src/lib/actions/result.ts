/** Resultado uniforme de toda server action del sistema. */
export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fallo<T = never>(error: unknown): ActionResult<T> {
  return { ok: false, error: mensajeDeError(error) };
}

const ERROR_GENERICO = "Ocurrió un error inesperado. Probá de nuevo.";

/** Errores técnicos de Postgres/PostgREST traducidos. Los de negocio (P0001) ya vienen en castellano. */
const MENSAJE_POR_CODIGO: Record<string, string> = {
  "42501": "No tenés permiso para hacer esto.",
  "23505": "Ya existe un registro con ese dato (por ejemplo, el mismo código o enlace).",
  "23503": "Falta un dato relacionado (puede que lo hayan borrado). Recargá la página.",
  "23514": "Algún dato no es válido. Revisalo y probá de nuevo.",
  "23502": "Falta completar un dato obligatorio.",
  "22P02": "Algún dato tiene un formato inválido.",
  PGRST116: "No encontramos lo que buscabas. Recargá la página.",
};

export function mensajeDeError(error: unknown): string {
  if (typeof error === "string") return error.trim() || ERROR_GENERICO;
  if (!error || typeof error !== "object") return ERROR_GENERICO;
  const { message, code } = error as { message?: unknown; code?: unknown };
  if (typeof code === "string" && code !== "P0001" && MENSAJE_POR_CODIGO[code]) return MENSAJE_POR_CODIGO[code];
  if (typeof message !== "string" || !message.trim()) return ERROR_GENERICO;
  if (/fetch failed|network|timeout/i.test(message)) return "No hay conexión con el servidor. Revisá internet y probá de nuevo.";
  return message;
}
