"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { perfilParaAccion } from "@/lib/panel/sesion";
import { primerError } from "@/lib/panel/validar";
import { createClient } from "@/lib/supabase/server";
import { fallo, ok, type ActionResult } from "./result";

const texto = (max: number) => z.string().trim().max(max).nullable();

const esquema = z.object({
  id: z.uuid(),
  nombre: z.string().trim().min(2, "El nombre es muy corto.").max(80),
  negocio: texto(120),
  email: z.union([z.email("El email no parece válido."), z.literal("")]).nullable(),
  documento: texto(30),
  ciudad: texto(80),
  provincia: texto(80),
  notas: texto(2000),
});

export async function guardarCliente(entrada: z.input<typeof esquema>): Promise<ActionResult> {
  const p = await perfilParaAccion("ver_clientes");
  if ("error" in p) return fallo(p.error);
  const v = esquema.safeParse(entrada);
  if (!v.success) return fallo(primerError(v.error));
  const { id, ...d } = v.data;
  const vacio = (x: string | null) => (x === "" ? null : x);
  const limpio = {
    nombre: d.nombre,
    negocio: vacio(d.negocio),
    email: vacio(d.email),
    documento: vacio(d.documento),
    ciudad: vacio(d.ciudad),
    provincia: vacio(d.provincia),
    notas: vacio(d.notas),
  };
  const supabase = await createClient();
  const { error } = await supabase.from("clientes").update(limpio).eq("id", id);
  if (error) return fallo(error);
  refresh();
  return ok(undefined);
}
