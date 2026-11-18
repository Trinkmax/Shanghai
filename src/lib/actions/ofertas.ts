"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { TAGS } from "@/lib/datos/catalogo";
import { perfilParaAccion } from "@/lib/panel/sesion";
import { primerError } from "@/lib/panel/validar";
import { createClient } from "@/lib/supabase/server";
import { fallo, ok, type ActionResult } from "./result";

const esquema = z.object({
  ids: z.array(z.uuid()).min(1, "Elegí al menos un producto.").max(500),
  modo: z.enum(["porcentaje", "precio", "marca"]),
  valor: z.number().positive().nullable(),
  hasta: z.string().nullable(),
});

/**
 * Pone productos en oferta:
 *  - porcentaje: precio de oferta = precio × (1 − %), redondeado a $10
 *  - precio: precio de oferta fijo (un solo producto)
 *  - marca: solo la marca "Oferta" (el precio ya es el rebajado)
 */
export async function ponerEnOferta(entrada: z.input<typeof esquema>): Promise<ActionResult<{ cantidad: number }>> {
  const p = await perfilParaAccion("editar_catalogo");
  if ("error" in p) return fallo(p.error);
  const v = esquema.safeParse(entrada);
  if (!v.success) return fallo(primerError(v.error));
  const { ids, modo, valor, hasta } = v.data;
  const supabase = await createClient();
  const oferta_hasta = hasta ? `${hasta.slice(0, 10)}T23:59:59-03:00` : null;

  if (modo === "marca") {
    const { error } = await supabase.from("productos").update({ en_oferta: true }).in("id", ids);
    if (error) return fallo(error);
  } else {
    if (valor == null) return fallo(modo === "porcentaje" ? "Indicá el porcentaje." : "Indicá el precio de oferta.");
    if (modo === "porcentaje" && (valor <= 0 || valor >= 90)) return fallo("El descuento tiene que estar entre 1% y 89%.");
    const { data: productos, error: e0 } = await supabase.from("productos").select("id, precio").in("id", ids);
    if (e0) return fallo(e0);
    for (const prod of productos ?? []) {
      const nuevo = modo === "porcentaje" ? Math.max(10, Math.round((prod.precio * (1 - valor / 100)) / 10) * 10) : valor;
      if (nuevo >= prod.precio) return fallo("El precio de oferta tiene que ser menor al precio de lista.");
      const { error } = await supabase
        .from("productos")
        .update({ precio_oferta: nuevo, oferta_hasta, en_oferta: true })
        .eq("id", prod.id);
      if (error) return fallo(error);
    }
  }
  updateTag(TAGS.catalogo);
  refresh();
  return ok({ cantidad: ids.length });
}

export async function quitarOferta(ids: string[]): Promise<ActionResult<{ cantidad: number }>> {
  const p = await perfilParaAccion("editar_catalogo");
  if ("error" in p) return fallo(p.error);
  const v = z.array(z.uuid()).min(1).max(1000).safeParse(ids);
  if (!v.success) return fallo("Elegí al menos un producto.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("productos")
    .update({ en_oferta: false, precio_oferta: null, oferta_hasta: null })
    .in("id", v.data);
  if (error) return fallo(error);
  updateTag(TAGS.catalogo);
  refresh();
  return ok({ cantidad: v.data.length });
}

export async function quitarTodasLasOfertas(): Promise<ActionResult<{ cantidad: number }>> {
  const p = await perfilParaAccion("editar_catalogo");
  if ("error" in p) return fallo(p.error);
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("productos")
    .update({ en_oferta: false, precio_oferta: null, oferta_hasta: null }, { count: "exact" })
    .or("en_oferta.eq.true,precio_oferta.not.is.null");
  if (error) return fallo(error);
  updateTag(TAGS.catalogo);
  refresh();
  return ok({ cantidad: count ?? 0 });
}
