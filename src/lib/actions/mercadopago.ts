"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { TAGS } from "@/lib/datos/catalogo";
import { invocarFuncion } from "@/lib/panel/funciones";
import { perfilParaAccion } from "@/lib/panel/sesion";
import { primerError } from "@/lib/panel/validar";
import { fallo, ok, type ActionResult } from "./result";

export type CuentaMP = { id: number; nickname: string; email: string; site_id: string; nombre: string; prueba: boolean };

const esquema = z.object({
  access_token: z.string().trim().min(20, "Pegá el Access Token completo."),
  public_key: z.string().trim().min(20, "Pegá la Public Key completa."),
  webhook_secret: z.string().trim().max(200).optional(),
});

/** Conecta la cuenta: la Edge Function valida el token contra Mercado Pago y lo guarda en Vault. */
export async function conectarMercadoPago(
  entrada: z.input<typeof esquema>,
): Promise<ActionResult<{ cuenta: CuentaMP; modo: "produccion" | "prueba" }>> {
  const p = await perfilParaAccion("mercadopago_cambiar");
  if ("error" in p) return fallo(p.error);
  const v = esquema.safeParse(entrada);
  if (!v.success) return fallo(primerError(v.error));
  const r = await invocarFuncion<{ cuenta: CuentaMP; modo: "produccion" | "prueba" }>("shangai-mp", { accion: "conectar", ...v.data });
  if (!r.ok) return fallo(r.error);
  updateTag(TAGS.configuracion); // la tienda empieza a ofrecer Mercado Pago
  refresh();
  return ok({ cuenta: r.data.cuenta, modo: r.data.modo });
}

export async function probarMercadoPago(): Promise<ActionResult<{ cuenta: CuentaMP }>> {
  const p = await perfilParaAccion("mercadopago_ver");
  if ("error" in p) return fallo(p.error);
  const r = await invocarFuncion<{ cuenta: CuentaMP }>("shangai-mp", { accion: "probar" });
  refresh();
  if (!r.ok) return fallo(r.error);
  return ok({ cuenta: r.data.cuenta });
}

export async function desconectarMercadoPago(): Promise<ActionResult> {
  const p = await perfilParaAccion("mercadopago_cambiar");
  if ("error" in p) return fallo(p.error);
  const r = await invocarFuncion("shangai-mp", { accion: "desconectar" });
  if (!r.ok) return fallo(r.error);
  updateTag(TAGS.configuracion);
  refresh();
  return ok(undefined);
}
