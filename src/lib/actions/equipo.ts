"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { invocarFuncion } from "@/lib/panel/funciones";
import { perfilParaAccion } from "@/lib/panel/sesion";
import { primerError } from "@/lib/panel/validar";
import { fallo, ok, type ActionResult } from "./result";

const ROLES = ["dueno", "encargado", "vendedor"] as const;

const esquemaAlta = z.object({
  nombre: z.string().trim().min(2, "Ingresá el nombre completo.").max(80),
  email: z.email("El email no parece válido.").trim().toLowerCase(),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
  rol: z.enum(ROLES),
});

/** Todas pasan por la Edge Function shangai-personal (usa service role del lado de Supabase). */
async function llamar<T>(cuerpo: Record<string, unknown>): Promise<ActionResult<T>> {
  const p = await perfilParaAccion("equipo");
  if ("error" in p) return fallo(p.error);
  const r = await invocarFuncion<T>("shangai-personal", cuerpo);
  if (!r.ok) return fallo(r.error);
  refresh();
  return ok(r.data);
}

export async function crearPersona(entrada: z.input<typeof esquemaAlta>) {
  const v = esquemaAlta.safeParse(entrada);
  if (!v.success) return fallo<{ vinculado: boolean }>(primerError(v.error));
  return llamar<{ vinculado: boolean }>({ accion: "crear", ...v.data });
}

export async function cambiarRol(id: string, rol: (typeof ROLES)[number]) {
  if (!ROLES.includes(rol)) return fallo<Record<string, never>>("Rol inválido.");
  return llamar<Record<string, never>>({ accion: "rol", id, rol });
}

export async function cambiarActivo(id: string, activo: boolean) {
  return llamar<Record<string, never>>({ accion: "activo", id, activo });
}

export async function cambiarClave(id: string, password: string) {
  if (password.length < 8) return fallo<Record<string, never>>("La contraseña debe tener al menos 8 caracteres.");
  return llamar<Record<string, never>>({ accion: "clave", id, password });
}

export async function quitarPersona(id: string) {
  return llamar<Record<string, never>>({ accion: "eliminar", id });
}
