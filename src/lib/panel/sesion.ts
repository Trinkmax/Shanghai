import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import type { RolPersonal } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";
import { puede, type Permiso } from "./permisos";

export type PerfilPanel = { id: string; nombre: string; email: string; rol: RolPersonal };

type Sesion = { hayUsuario: boolean; perfil: PerfilPanel | null };

/** Sesión + fila de `personal` activa, una sola vez por request. */
export const leerSesion = cache(async (): Promise<Sesion> => {
  // La sesión es de cada request: nunca se prerenderiza (getClaims compara el vencimiento con la hora).
  await connection();
  const supabase = await createClient();
  // getClaims valida la firma del token localmente (sin ir a Auth en cada render).
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  if (!sub) return { hayUsuario: false, perfil: null };

  const { data: fila, error } = await supabase
    .from("personal")
    .select("id, nombre, email, rol, activo")
    .eq("id", sub)
    .maybeSingle();
  if (error) throw new Error("No pudimos conectarnos con la base de datos. Reintentá en unos segundos.");
  if (!fila || !fila.activo) return { hayUsuario: true, perfil: null };
  return { hayUsuario: true, perfil: { id: fila.id, nombre: fila.nombre, email: fila.email, rol: fila.rol } };
});

/** Para páginas: sin sesión → login; sin acceso → login con motivo; sin permiso → resumen/pedidos. */
export async function requerirPerfil(permiso?: Permiso): Promise<PerfilPanel> {
  const { hayUsuario, perfil } = await leerSesion();
  if (!hayUsuario) redirect("/panel/ingresar");
  if (!perfil) redirect("/panel/ingresar?motivo=sin-acceso");
  if (permiso && !puede(perfil.rol, permiso)) redirect(puede(perfil.rol, "ver_resumen") ? "/panel" : "/panel/pedidos");
  return perfil;
}

/** Para server actions: devuelve el perfil o un mensaje de error (nunca redirige). */
export async function perfilParaAccion(permiso: Permiso): Promise<{ perfil: PerfilPanel } | { error: string }> {
  const { hayUsuario, perfil } = await leerSesion();
  if (!hayUsuario) return { error: "Tu sesión venció. Volvé a ingresar." };
  if (!perfil) return { error: "Tu cuenta no tiene acceso al panel." };
  if (!puede(perfil.rol, permiso)) return { error: "No tenés permiso para hacer esto." };
  return { perfil };
}
