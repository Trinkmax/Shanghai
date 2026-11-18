"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { RolPersonal } from "@/lib/database.types";
import { invocarFuncion } from "@/lib/panel/funciones";
import { leerSesion } from "@/lib/panel/sesion";
import { primerError } from "@/lib/panel/validar";
import { createClient } from "@/lib/supabase/server";
import { fallo, ok, type ActionResult } from "./result";

/** Después de ingresar: confirma que la cuenta es del equipo; si no, cierra la sesión. */
export async function verificarAcceso(): Promise<ActionResult<{ nombre: string; rol: RolPersonal }>> {
  const { hayUsuario, perfil } = await leerSesion();
  if (!hayUsuario) return fallo("No pudimos iniciar la sesión. Probá de nuevo.");
  if (!perfil) {
    const supabase = await createClient();
    await supabase.auth.signOut();
    return fallo("Tu cuenta no tiene acceso al panel. Pedile al dueño que te sume al equipo.");
  }
  return ok({ nombre: perfil.nombre, rol: perfil.rol });
}

export async function cerrarSesion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/panel/ingresar?motivo=salida");
}

const esquemaInicial = z.object({
  codigo: z.string().trim().min(6, "Ingresá el código inicial."),
  nombre: z.string().trim().min(2, "Ingresá tu nombre."),
  email: z.email("El email no parece válido.").trim().toLowerCase(),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
});

/** Primera cuenta de dueño (código inicial guardado en Vault). */
export async function inicializarDueno(entrada: z.input<typeof esquemaInicial>): Promise<ActionResult<{ vinculado: boolean }>> {
  const v = esquemaInicial.safeParse(entrada);
  if (!v.success) return fallo(primerError(v.error));
  const r = await invocarFuncion<{ vinculado: boolean }>("shangai-personal", { accion: "inicializar", ...v.data }, { conSesion: false });
  if (!r.ok) return fallo(r.error);
  return ok({ vinculado: Boolean(r.data.vinculado) });
}
