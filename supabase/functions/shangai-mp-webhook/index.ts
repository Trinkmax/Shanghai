// shangai-mp-webhook — Notificaciones de Mercado Pago (Checkout Pro).
// Cada preferencia manda notification_url acá. Nunca confiamos en el cuerpo:
// con el id recibido consultamos el pago a la API de MP con nuestro token y
// recién ahí actualizamos el pedido (shangai.registrar_pago, idempotente).
// Si el dueño cargó la "clave secreta" de webhooks, además validamos x-signature.
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
  db: { schema: "shangai" },
});

const ok = (b: unknown = { ok: true }, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

async function hmacHex(clave: string, texto: string) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(clave), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const firma = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(firma)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function igualSeguro(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

Deno.serve(async (req) => {
  if (req.method === "GET") return ok({ ok: true, servicio: "shangai-mp-webhook" });
  if (req.method !== "POST") return ok({ error: "Método no permitido" }, 405);

  const url = new URL(req.url);
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* MP a veces notifica solo por query string */
  }

  const tipo = String(url.searchParams.get("type") ?? url.searchParams.get("topic") ?? body.type ?? body.topic ?? "");
  const dataId = String(
    url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? (body.data as Record<string, unknown> | undefined)?.id ?? "",
  );

  if (tipo !== "payment" || !/^\d+$/.test(dataId)) return ok({ ok: true, ignorado: tipo || "sin_tipo" });

  const { data: cred } = await admin.rpc("mp_credenciales");
  const { access_token: token, webhook_secret: secreto } = (cred ?? {}) as { access_token?: string; webhook_secret?: string };
  if (!token) return ok({ ok: true, ignorado: "sin_credenciales" });

  // Firma (si hay clave secreta configurada): manifest = id:<data.id>;request-id:<x-request-id>;ts:<ts>;
  if (secreto) {
    const firma = req.headers.get("x-signature") ?? "";
    const requestId = req.headers.get("x-request-id") ?? "";
    const partes = Object.fromEntries(firma.split(",").map((p) => p.trim().split("=", 2) as [string, string]));
    const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${partes.ts ?? ""};`;
    const esperado = await hmacHex(secreto, manifest);
    if (!partes.v1 || !igualSeguro(esperado, partes.v1)) {
      console.warn("Firma inválida en webhook de MP", { dataId });
      return ok({ error: "firma inválida" }, 401);
    }
  }

  const r = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, { headers: { Authorization: `Bearer ${token}` } });
  if (r.status === 404) return ok({ ok: true, ignorado: "pago_inexistente" });
  if (!r.ok) {
    console.error("MP pago", dataId, r.status);
    return ok({ error: "reintentar" }, 502); // MP reintenta más tarde
  }
  const pago = await r.json();
  const pedidoId = String(pago.external_reference ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(pedidoId)) return ok({ ok: true, ignorado: "sin_referencia" });

  const { data, error } = await admin.rpc("registrar_pago", {
    p_pedido: pedidoId,
    p_referencia: String(pago.id),
    p_estado: String(pago.status ?? ""),
    p_detalle: pago.status_detail ? String(pago.status_detail) : null,
    p_monto: pago.transaction_amount != null ? Number(pago.transaction_amount) : null,
    p_medio: pago.payment_method_id ? String(pago.payment_method_id) : null,
    p_cuotas: pago.installments != null ? Number(pago.installments) : null,
    p_datos: {
      status: pago.status,
      status_detail: pago.status_detail,
      payment_type_id: pago.payment_type_id,
      payment_method_id: pago.payment_method_id,
      transaction_amount: pago.transaction_amount,
      installments: pago.installments,
      date_approved: pago.date_approved,
      payer_email: pago.payer?.email ?? null,
      live_mode: pago.live_mode,
    },
  });
  if (error) {
    console.error("registrar_pago", error);
    return ok({ error: "reintentar" }, 500);
  }
  return ok({ ok: true, resultado: data });
});
