"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { TAGS } from "@/lib/datos/catalogo";
import { perfilParaAccion } from "@/lib/panel/sesion";
import { primerError } from "@/lib/panel/validar";
import { createClient } from "@/lib/supabase/server";
import type { TablaUpdate } from "@/lib/database.types";
import { fallo, ok, type ActionResult } from "./result";

const opcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((v) => (v ? v : null));

const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Usá el formato 24 h, por ejemplo 09:00.");

const esquemaTienda = z.object({
  nombre_tienda: z.string().trim().min(2, "Ingresá el nombre de la tienda.").max(80),
  descripcion: z.string().trim().min(2).max(120),
  whatsapp: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length >= 10 && v.length <= 15, "El WhatsApp tiene que tener el código de país y de área (ej. 5493516061756)."),
  telefono: opcional(40),
  email: z.union([z.email("El email no parece válido."), z.literal(""), z.null()]).transform((v) => v || null),
  direccion: z.string().trim().min(3, "Ingresá la dirección.").max(120),
  ciudad: z.string().trim().min(2).max(80),
  mapa_url: z
    .union([z.url("El enlace del mapa no es válido."), z.literal(""), z.null()])
    .transform((v) => v || null),
  instagram: opcional(60).transform((v) => (v ? v.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "") : null)),
  facebook: opcional(200),
  anuncio: opcional(160),
});

const esquemaHorarios = z
  .array(z.object({ dia: z.number().int().min(0).max(6), abre: hora, cierra: hora }))
  .max(28)
  .refine((l) => l.every((h) => h.abre < h.cierra), "En cada franja, la hora de apertura tiene que ser antes que la de cierre.");

const esquemaVenta = z.object({
  compra_minima: z.number().min(0, "La compra mínima no puede ser negativa.").max(100_000_000),
});

const esquemaEnvios = z
  .array(
    z.object({
      id: z.enum(["retiro", "envio_local", "envio_interior"]),
      nombre: z.string().trim().min(2, "Cada forma de entrega necesita un nombre.").max(60),
      detalle: z.string().trim().max(160),
      precio: z.number().min(0).nullable(),
      gratis_desde: z.number().min(0).nullable(),
      activo: z.boolean(),
    }),
  )
  .length(3)
  .refine((l) => l.some((e) => e.activo), "Dejá al menos una forma de entrega activa.");

const esquemaPagos = z.object({
  pago_mercadopago: z.boolean(),
  pago_transferencia: z.boolean(),
  pago_efectivo: z.boolean(),
  descuento_transferencia: z.number().min(0).max(50, "El descuento máximo es 50%."),
  transferencia_datos: z.object({
    titular: z.string().trim().max(80),
    banco: z.string().trim().max(80),
    cbu: z
      .string()
      .transform((v) => v.replace(/\D/g, ""))
      .refine((v) => v === "" || v.length === 22, "El CBU/CVU tiene 22 dígitos."),
    alias: z.string().trim().max(40),
    cuit: z.string().trim().max(20),
  }),
});

type Seccion = "tienda" | "horarios" | "venta" | "envios" | "pagos";

export async function guardarAjustes(seccion: Seccion, entrada: unknown): Promise<ActionResult> {
  const p = await perfilParaAccion("ajustes");
  if ("error" in p) return fallo(p.error);

  let cambios: TablaUpdate<"configuracion">;
  if (seccion === "tienda") {
    const v = esquemaTienda.safeParse(entrada);
    if (!v.success) return fallo(primerError(v.error));
    cambios = v.data;
  } else if (seccion === "horarios") {
    const v = esquemaHorarios.safeParse(entrada);
    if (!v.success) return fallo(primerError(v.error));
    cambios = { horarios: [...v.data].sort((a, b) => a.dia - b.dia || a.abre.localeCompare(b.abre)) };
  } else if (seccion === "venta") {
    const v = esquemaVenta.safeParse(entrada);
    if (!v.success) return fallo(primerError(v.error));
    cambios = v.data;
  } else if (seccion === "envios") {
    const v = esquemaEnvios.safeParse(entrada);
    if (!v.success) return fallo(primerError(v.error));
    cambios = { envios: v.data };
  } else if (seccion === "pagos") {
    const v = esquemaPagos.safeParse(entrada);
    if (!v.success) return fallo(primerError(v.error));
    if (!v.data.pago_mercadopago && !v.data.pago_transferencia && !v.data.pago_efectivo)
      return fallo("Dejá al menos un medio de pago activo.");
    cambios = v.data;
  } else {
    return fallo("Sección inválida.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("configuracion").update(cambios).eq("id", true);
  if (error) return fallo(error);
  updateTag(TAGS.configuracion);
  refresh();
  return ok(undefined);
}
