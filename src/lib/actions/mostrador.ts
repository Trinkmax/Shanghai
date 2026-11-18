"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { TAGS } from "@/lib/datos/catalogo";
import { perfilParaAccion } from "@/lib/panel/sesion";
import { primerError } from "@/lib/panel/validar";
import { createClient } from "@/lib/supabase/server";
import { fallo, ok, type ActionResult } from "./result";

const esquema = z.object({
  items: z
    .array(z.object({ producto_id: z.uuid(), cantidad: z.number().int().min(1).max(100000) }))
    .min(1, "Agregá al menos un producto al ticket."),
  metodo_pago: z.enum(["efectivo", "transferencia", "tarjeta", "mercadopago"]),
  descuento: z.number().min(0).max(100_000_000).default(0),
  cliente: z.object({ nombre: z.string().trim().max(80).optional(), telefono: z.string().trim().max(30).optional() }).optional(),
  notas: z.string().trim().max(1000).optional(),
});

export async function registrarVenta(
  entrada: z.input<typeof esquema>,
): Promise<ActionResult<{ id: string; numero: number; total: number }>> {
  const p = await perfilParaAccion("mostrador");
  if ("error" in p) return fallo(p.error);
  const v = esquema.safeParse(entrada);
  if (!v.success) return fallo(primerError(v.error));

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("crear_venta_mostrador", { p_datos: v.data });
  if (error) return fallo(error);
  updateTag(TAGS.catalogo); // stock y "más vendidos"
  const r = data as { id: string; numero: number; total: number };
  return ok({ id: r.id, numero: r.numero, total: Number(r.total) });
}
