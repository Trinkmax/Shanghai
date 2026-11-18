"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { TAGS } from "@/lib/datos/catalogo";
import { perfilParaAccion } from "@/lib/panel/sesion";
import { primerError } from "@/lib/panel/validar";
import { createClient } from "@/lib/supabase/server";
import { ACRILICOS } from "@/lib/tienda";
import { slugify } from "@/lib/utils";
import { fallo, ok, type ActionResult } from "./result";

const esquema = z.object({
  id: z.number().int().positive().optional(),
  nombre: z.string().trim().min(2, "El nombre es muy corto.").max(60, "El nombre es muy largo."),
  descripcion: z.string().trim().max(400).nullable().optional(),
  icono: z.string().min(1).max(40),
  color: z.string().refine((c) => c in ACRILICOS, "Color inválido."),
  activa: z.boolean(),
});

export async function guardarRubro(entrada: z.input<typeof esquema>): Promise<ActionResult<{ id: number }>> {
  const p = await perfilParaAccion("editar_catalogo");
  if ("error" in p) return fallo(p.error);
  const v = esquema.safeParse(entrada);
  if (!v.success) return fallo(primerError(v.error));
  const { id, ...d } = v.data;
  const supabase = await createClient();

  if (id) {
    const { error } = await supabase.from("categorias").update({ ...d, descripcion: d.descripcion ?? null }).eq("id", id);
    if (error) return fallo(error);
    updateTag(TAGS.catalogo);
    refresh();
    return ok({ id });
  }

  const { data: ultimo } = await supabase.from("categorias").select("orden").order("orden", { ascending: false }).limit(1).maybeSingle();
  let slug = slugify(d.nombre) || "rubro";
  const { data: existe } = await supabase.from("categorias").select("id").eq("slug", slug).maybeSingle();
  if (existe) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  const { data, error } = await supabase
    .from("categorias")
    .insert({ ...d, descripcion: d.descripcion ?? null, slug, orden: (ultimo?.orden ?? 0) + 1 })
    .select("id")
    .single();
  if (error) return fallo(error);
  updateTag(TAGS.catalogo);
  refresh();
  return ok({ id: data.id });
}

export async function reordenarRubros(ids: number[]): Promise<ActionResult> {
  const p = await perfilParaAccion("editar_catalogo");
  if ("error" in p) return fallo(p.error);
  const v = z.array(z.number().int().positive()).min(1).max(200).safeParse(ids);
  if (!v.success) return fallo("Orden inválido.");
  const supabase = await createClient();
  const resultados = await Promise.all(v.data.map((id, i) => supabase.from("categorias").update({ orden: i + 1 }).eq("id", id)));
  const error = resultados.find((r) => r.error)?.error;
  if (error) return fallo(error);
  updateTag(TAGS.catalogo);
  return ok(undefined);
}

export async function eliminarRubro(id: number): Promise<ActionResult> {
  const p = await perfilParaAccion("editar_catalogo");
  if ("error" in p) return fallo(p.error);
  const supabase = await createClient();
  const { count } = await supabase.from("productos").select("id", { count: "exact", head: true }).eq("categoria_id", id);
  if ((count ?? 0) > 0)
    return fallo(`Este rubro tiene ${count} productos. Movelos a otro rubro o desactivá el rubro en lugar de borrarlo.`);
  const { error } = await supabase.from("categorias").delete().eq("id", id);
  if (error) return fallo(error);
  updateTag(TAGS.catalogo);
  refresh();
  return ok(undefined);
}
