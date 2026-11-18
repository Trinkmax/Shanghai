"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { TAGS } from "@/lib/datos/catalogo";
import { perfilParaAccion } from "@/lib/panel/sesion";
import { createClient } from "@/lib/supabase/server";
import { fallo, ok, type ActionResult } from "./result";

/** Fija el ranking de "Más vendidos": la lista llega en orden (posición 1 = primero). */
export async function guardarRanking(ids: string[]): Promise<ActionResult<{ cantidad: number }>> {
  const p = await perfilParaAccion("editar_catalogo");
  if ("error" in p) return fallo(p.error);
  const v = z.array(z.uuid()).max(60, "Fijá hasta 60 productos.").safeParse(ids);
  if (!v.success) return fallo(v.error.issues[0]?.message ?? "Lista inválida.");
  const supabase = await createClient();

  let limpiar = supabase.from("productos").update({ ranking_vendidos: null }).not("ranking_vendidos", "is", null);
  if (v.data.length) limpiar = limpiar.not("id", "in", `(${v.data.join(",")})`);
  const { error: e0 } = await limpiar;
  if (e0) return fallo(e0);

  const resultados = await Promise.all(
    v.data.map((id, i) => supabase.from("productos").update({ ranking_vendidos: i + 1 }).eq("id", id)),
  );
  const error = resultados.find((r) => r.error)?.error;
  if (error) return fallo(error);
  updateTag(TAGS.catalogo);
  refresh();
  return ok({ cantidad: v.data.length });
}
