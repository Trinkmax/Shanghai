import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Llama a una Edge Function de Shangai (shangai-personal / shangai-mp) desde el servidor,
 * reenviando el token de la sesión. La función valida el token y el rol por su cuenta.
 */
export async function invocarFuncion<T = Record<string, unknown>>(
  nombre: "shangai-personal" | "shangai-mp",
  cuerpo: Record<string, unknown>,
  { conSesion = true }: { conSesion?: boolean } = {},
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  };
  if (conSesion) {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return { ok: false, error: "Tu sesión venció. Volvé a ingresar." };
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  try {
    const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${nombre}`, {
      method: "POST",
      headers,
      body: JSON.stringify(cuerpo),
      cache: "no-store",
    });
    const datos = (await r.json().catch(() => ({}))) as Record<string, unknown>;
    if (!r.ok || datos.error) return { ok: false, error: String(datos.error ?? "Ocurrió un error inesperado. Probá de nuevo.") };
    return { ok: true, data: datos as T };
  } catch {
    return { ok: false, error: "No hay conexión con el servidor. Revisá internet y probá de nuevo." };
  }
}
