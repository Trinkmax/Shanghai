"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { TAGS } from "@/lib/datos/catalogo";
import { perfilParaAccion } from "@/lib/panel/sesion";
import { primerError } from "@/lib/panel/validar";
import { createClient } from "@/lib/supabase/server";
import { fallo, ok, type ActionResult } from "./result";

const enlace = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === "" || v.startsWith("/") || /^https?:\/\//.test(v), "El enlace tiene que empezar con / (una página de la tienda) o con https://.");

const esquema = z.object({
  id: z.number().int().positive().optional(),
  titulo: z.string().trim().min(2, "El título es muy corto.").max(90, "El título es muy largo (máx. 90)."),
  bajada: z.string().trim().max(220, "El texto es muy largo (máx. 220).").nullable(),
  cta_texto: z.string().trim().max(40).nullable(),
  cta_href: enlace.nullable(),
  tono: z.enum(["indigo", "ambar", "noche", "claro"]),
  activo: z.boolean(),
  desde: z.string().nullable(),
  hasta: z.string().nullable(),
});

const fecha = (f: string | null, fin = false) => (f ? `${f.slice(0, 10)}T${fin ? "23:59:59" : "00:00:00"}-03:00` : null);

export async function guardarBanner(entrada: z.input<typeof esquema>): Promise<ActionResult<{ id: number }>> {
  const p = await perfilParaAccion("editar_portada");
  if ("error" in p) return fallo(p.error);
  const v = esquema.safeParse(entrada);
  if (!v.success) return fallo(primerError(v.error));
  const { id, ...d } = v.data;
  const fila = {
    ...d,
    bajada: d.bajada || null,
    cta_texto: d.cta_texto || null,
    cta_href: d.cta_href || null,
    desde: fecha(d.desde),
    hasta: fecha(d.hasta, true),
  };
  const supabase = await createClient();
  if (id) {
    const { error } = await supabase.from("banners").update(fila).eq("id", id);
    if (error) return fallo(error);
    updateTag(TAGS.portada);
    refresh();
    return ok({ id });
  }
  const { data: ultimo } = await supabase.from("banners").select("orden").order("orden", { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await supabase
    .from("banners")
    .insert({ ...fila, orden: (ultimo?.orden ?? 0) + 1 })
    .select("id")
    .single();
  if (error) return fallo(error);
  updateTag(TAGS.portada);
  refresh();
  return ok({ id: data.id });
}

export async function eliminarBanner(id: number): Promise<ActionResult> {
  const p = await perfilParaAccion("editar_portada");
  if ("error" in p) return fallo(p.error);
  const supabase = await createClient();
  const { error } = await supabase.from("banners").delete().eq("id", id);
  if (error) return fallo(error);
  updateTag(TAGS.portada);
  refresh();
  return ok(undefined);
}

export async function reordenarBanners(ids: number[]): Promise<ActionResult> {
  const p = await perfilParaAccion("editar_portada");
  if ("error" in p) return fallo(p.error);
  const supabase = await createClient();
  const r = await Promise.all(ids.map((id, i) => supabase.from("banners").update({ orden: i + 1 }).eq("id", id)));
  const error = r.find((x) => x.error)?.error;
  if (error) return fallo(error);
  updateTag(TAGS.portada);
  refresh();
  return ok(undefined);
}

/** Productos de la vidriera de la portada (flag destacado). */
export async function alternarDestacado(id: string, destacado: boolean): Promise<ActionResult> {
  const p = await perfilParaAccion("editar_portada");
  if ("error" in p) return fallo(p.error);
  if (!z.uuid().safeParse(id).success) return fallo("Producto inválido.");
  const supabase = await createClient();
  if (destacado) {
    const { count } = await supabase.from("productos").select("id", { count: "exact", head: true }).eq("destacado", true);
    if ((count ?? 0) >= 24) return fallo("La vidriera admite hasta 24 productos destacados. Quitá alguno primero.");
  }
  const { error } = await supabase.from("productos").update({ destacado }).eq("id", id);
  if (error) return fallo(error);
  updateTag(TAGS.catalogo);
  refresh();
  return ok(undefined);
}
