"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { TAGS } from "@/lib/datos/catalogo";
import { perfilParaAccion } from "@/lib/panel/sesion";
import { primerError } from "@/lib/panel/validar";
import { createClient } from "@/lib/supabase/server";
import { fallo, ok, type ActionResult } from "./result";

const ESTADOS = ["pendiente", "confirmado", "preparando", "listo", "enviado", "entregado", "cancelado"] as const;
const PAGOS = ["pendiente", "en_proceso", "aprobado", "rechazado", "reembolsado", "cancelado"] as const;

const esquema = z
  .object({
    id: z.uuid("Pedido inválido."),
    estado: z.enum(ESTADOS).optional(),
    estado_pago: z.enum(PAGOS).optional(),
    nota: z.string().trim().max(1000, "La nota es demasiado larga.").optional(),
  })
  .refine((d) => d.estado || d.estado_pago || d.nota, "No hay cambios para guardar.");

/** Cambia estado / pago o agrega una nota interna (todo pasa por shangai.actualizar_pedido). */
export async function actualizarPedido(entrada: z.input<typeof esquema>): Promise<ActionResult<{ estado: string; estado_pago: string }>> {
  const p = await perfilParaAccion("gestionar_pedidos");
  if ("error" in p) return fallo(p.error);
  const v = esquema.safeParse(entrada);
  if (!v.success) return fallo(primerError(v.error));

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("actualizar_pedido", {
    p_pedido: v.data.id,
    p_estado: v.data.estado ?? null,
    p_estado_pago: v.data.estado_pago ?? null,
    p_nota: v.data.nota || null,
  });
  if (error) return fallo(error);
  // Cancelar repone stock y confirmar suma "vendidos": el catálogo público cambia.
  if (v.data.estado || v.data.estado_pago) updateTag(TAGS.catalogo);
  refresh();
  return ok({ estado: data.estado, estado_pago: data.estado_pago });
}
