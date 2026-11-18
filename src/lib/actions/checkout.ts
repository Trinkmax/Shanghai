"use server";

import { headers } from "next/headers";
import { esquemaPedido } from "@/lib/pedido-esquema";
import { ok, type ActionResult } from "./result";

const FUNCION = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/shangai-checkout`;
const CLAVE = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export type PedidoConfirmado = { token: string; numero: number; total: number; init_point: string | null; aviso: string | null };

async function origenDelPedido() {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) return `${h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")}://${host}`;
  return process.env.NEXT_PUBLIC_SITIO_URL ?? null;
}

async function llamar(cuerpo: Record<string, unknown>) {
  try {
    const r = await fetch(FUNCION, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: CLAVE, Authorization: `Bearer ${CLAVE}` },
      body: JSON.stringify(cuerpo),
      cache: "no-store",
    });
    const d = (await r.json().catch(() => null)) as Record<string, unknown> | null;
    return { ok: r.ok && Boolean(d?.ok), d };
  } catch {
    return { ok: false, d: { error: "No hay conexión con el servidor. Revisá internet y probá de nuevo." } };
  }
}

/** Crea el pedido (la base valida precios, mínimo, stock y envío). */
export async function confirmarPedido(datos: unknown): Promise<ActionResult<PedidoConfirmado>> {
  const r = esquemaPedido.safeParse(datos);
  if (!r.success) return { ok: false, error: r.error.issues[0]?.message ?? "Revisá los datos del pedido." };
  const { ok: bien, d } = await llamar({ accion: "crear", ...r.data, origen: await origenDelPedido() });
  if (!bien || !d) return { ok: false, error: (d?.error as string) ?? "No pudimos registrar el pedido. Probá de nuevo." };
  return ok({
    token: String(d.token),
    numero: Number(d.numero),
    total: Number(d.total),
    init_point: (d.init_point as string) ?? null,
    aviso: (d.aviso as string) ?? null,
  });
}

/** Genera un nuevo link de pago de Mercado Pago para un pedido pendiente. */
export async function pagarPedido(token: string): Promise<ActionResult<{ init_point: string }>> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return { ok: false, error: "Pedido inválido." };
  const { ok: bien, d } = await llamar({ accion: "pagar", token, origen: await origenDelPedido() });
  if (!bien || !d?.init_point) return { ok: false, error: (d?.error as string) ?? "No pudimos abrir Mercado Pago. Probá de nuevo." };
  return ok({ init_point: String(d.init_point) });
}
