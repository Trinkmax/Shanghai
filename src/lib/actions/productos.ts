"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { TAGS } from "@/lib/datos/catalogo";
import { rutaMiniatura } from "@/lib/imagenes";
import { perfilParaAccion } from "@/lib/panel/sesion";
import { primerError } from "@/lib/panel/validar";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";
import { fallo, ok, type ActionResult } from "./result";

const ruta = z.string().regex(/^productos\/[a-z0-9-]+\/[\w-]+\.webp$/, "Imagen inválida.");

const esquema = z
  .object({
    id: z.uuid().optional(),
    nombre: z.string().trim().min(2, "El nombre es muy corto.").max(160, "El nombre es muy largo."),
    codigo: z.string().trim().min(1, "Ingresá el código.").max(40, "El código es muy largo."),
    categoria_id: z.number().int().positive().nullable(),
    precio: z.number({ error: "Ingresá el precio." }).positive("El precio tiene que ser mayor a 0."),
    precio_oferta: z.number().positive().nullable(),
    oferta_hasta: z.string().nullable(),
    en_oferta: z.boolean(),
    stock: z.number().int().min(0, "El stock no puede ser negativo.").nullable(),
    cantidad_minima: z.number().int().min(1, "La cantidad mínima es 1.").max(10000),
    descripcion: z.string().trim().max(4000).nullable(),
    es_novedad: z.boolean(),
    destacado: z.boolean(),
    activo: z.boolean(),
    ranking_vendidos: z.number().int().min(1).max(999).nullable(),
    imagenes: z.array(ruta).max(12, "Máximo 12 fotos por producto."),
  })
  .refine((d) => d.precio_oferta == null || d.precio_oferta < d.precio, {
    message: "El precio de oferta tiene que ser menor al precio de lista.",
    path: ["precio_oferta"],
  });

export type DatosProducto = z.input<typeof esquema>;

function armarSlug(nombre: string, codigo: string) {
  const base = slugify(nombre).slice(0, 70).replace(/-+$/, "");
  const clave = slugify(codigo);
  return base ? `${base}-${clave}` : clave;
}

/** Fin del día (hora de Córdoba) para una fecha "AAAA-MM-DD". */
const finDelDia = (fecha: string | null) => (fecha ? `${fecha.slice(0, 10)}T23:59:59-03:00` : null);

export async function guardarProducto(entrada: DatosProducto): Promise<ActionResult<{ id: string; slug: string }>> {
  const p = await perfilParaAccion("editar_catalogo");
  if ("error" in p) return fallo(p.error);
  const v = esquema.safeParse(entrada);
  if (!v.success) return fallo(primerError(v.error));
  const d = v.data;
  const supabase = await createClient();

  const fila = {
    nombre: d.nombre,
    codigo: d.codigo,
    categoria_id: d.categoria_id,
    precio: d.precio,
    precio_oferta: d.precio_oferta,
    oferta_hasta: d.precio_oferta != null ? finDelDia(d.oferta_hasta) : null,
    en_oferta: d.en_oferta,
    stock: d.stock,
    cantidad_minima: d.cantidad_minima,
    descripcion: d.descripcion || null,
    es_novedad: d.es_novedad,
    destacado: d.destacado,
    activo: d.activo,
    ranking_vendidos: d.ranking_vendidos,
    imagenes: d.imagenes,
  };

  if (d.id) {
    const { data: actual, error: e0 } = await supabase.from("productos").select("codigo, slug").eq("id", d.id).single();
    if (e0) return fallo(e0);
    const slug = actual.codigo !== d.codigo ? armarSlug(d.nombre, d.codigo) : actual.slug;
    const { error } = await supabase.from("productos").update({ ...fila, slug }).eq("id", d.id);
    if (error) return fallo(error.code === "23505" ? `Ya hay otro producto con el código ${d.codigo}.` : error);
    updateTag(TAGS.catalogo);
    refresh();
    return ok({ id: d.id, slug });
  }

  const slug = armarSlug(d.nombre, d.codigo);
  const { data, error } = await supabase.from("productos").insert({ ...fila, slug }).select("id").single();
  if (error) return fallo(error.code === "23505" ? `Ya hay un producto con el código ${d.codigo}.` : error);
  updateTag(TAGS.catalogo);
  return ok({ id: data.id, slug });
}

const esquemaRapido = z.object({
  id: z.uuid(),
  precio: z.number().positive("El precio tiene que ser mayor a 0.").optional(),
  stock: z.number().int().min(0).nullable().optional(),
  activo: z.boolean().optional(),
});

/** Edición en la tabla (precio / stock / activo) sin abrir la ficha. */
export async function actualizarRapido(entrada: z.input<typeof esquemaRapido>): Promise<ActionResult> {
  const p = await perfilParaAccion("editar_catalogo");
  if ("error" in p) return fallo(p.error);
  const v = esquemaRapido.safeParse(entrada);
  if (!v.success) return fallo(primerError(v.error));
  const { id, ...cambios } = v.data;
  const supabase = await createClient();
  if (cambios.precio != null) {
    const { data: actual } = await supabase.from("productos").select("precio_oferta").eq("id", id).single();
    if (actual?.precio_oferta != null && actual.precio_oferta >= cambios.precio)
      return fallo("El precio quedó por debajo del precio de oferta: ajustá la oferta primero.");
  }
  const { error } = await supabase.from("productos").update(cambios).eq("id", id);
  if (error) return fallo(error);
  updateTag(TAGS.catalogo);
  return ok(undefined);
}

const esquemaMasivo = z.object({
  ids: z.array(z.uuid()).min(1, "Elegí al menos un producto.").max(1000),
  accion: z.enum(["activar", "desactivar", "novedad", "quitar_novedad", "mover", "destacar", "quitar_destacado"]),
  categoria_id: z.number().int().positive().nullable().optional(),
});

export async function accionMasiva(entrada: z.input<typeof esquemaMasivo>): Promise<ActionResult<{ cantidad: number }>> {
  const p = await perfilParaAccion("editar_catalogo");
  if ("error" in p) return fallo(p.error);
  const v = esquemaMasivo.safeParse(entrada);
  if (!v.success) return fallo(primerError(v.error));
  const { ids, accion, categoria_id } = v.data;
  const cambios =
    accion === "activar"
      ? { activo: true }
      : accion === "desactivar"
        ? { activo: false }
        : accion === "novedad"
          ? { es_novedad: true }
          : accion === "quitar_novedad"
            ? { es_novedad: false }
            : accion === "destacar"
              ? { destacado: true }
              : accion === "quitar_destacado"
                ? { destacado: false }
                : { categoria_id: categoria_id ?? null };
  const supabase = await createClient();
  const { error, count } = await supabase.from("productos").update(cambios, { count: "exact" }).in("id", ids);
  if (error) return fallo(error);
  updateTag(TAGS.catalogo);
  refresh();
  return ok({ cantidad: count ?? ids.length });
}

export async function guardarImagenes(id: string, imagenes: string[]): Promise<ActionResult> {
  const p = await perfilParaAccion("editar_catalogo");
  if ("error" in p) return fallo(p.error);
  const v = z.object({ id: z.uuid(), imagenes: z.array(ruta).max(12) }).safeParse({ id, imagenes });
  if (!v.success) return fallo(primerError(v.error));
  const supabase = await createClient();
  const { error } = await supabase.from("productos").update({ imagenes: v.data.imagenes }).eq("id", id);
  if (error) return fallo(error);
  updateTag(TAGS.catalogo);
  return ok(undefined);
}

export async function eliminarProducto(id: string): Promise<ActionResult> {
  const p = await perfilParaAccion("editar_catalogo");
  if ("error" in p) return fallo(p.error);
  if (!z.uuid().safeParse(id).success) return fallo("Producto inválido.");
  const supabase = await createClient();
  const { data: prod } = await supabase.from("productos").select("imagenes").eq("id", id).single();
  const { error } = await supabase.from("productos").delete().eq("id", id);
  if (error) return fallo(error);
  const archivos = (prod?.imagenes ?? []).flatMap((r) => [r, rutaMiniatura(r)]);
  if (archivos.length) await supabase.storage.from("shangai").remove(archivos);
  updateTag(TAGS.catalogo);
  return ok(undefined);
}
