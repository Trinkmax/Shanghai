// shangai-checkout — Pedidos de la tienda online de Shangai Center.
// Público (sin JWT): los precios, el mínimo, el stock y el envío los calcula la
// base en shangai.crear_pedido (service role). Si el pago es con Mercado Pago,
// crea la preferencia de Checkout Pro con el access token guardado en Vault.
//
// Acciones (POST JSON):
//   { accion: "crear", items, cliente, entrega, metodo_pago, notas, origen }
//   { accion: "pagar", token, origen }   → nueva preferencia para un pedido pendiente
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/shangai-mp-webhook`;
const STORAGE_URL = `${SUPABASE_URL}/storage/v1/object/public/shangai/`;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
  db: { schema: "shangai" },
});

// Orígenes válidos para volver desde Mercado Pago (además de SHANGAI_SITIOS, separados por coma).
const extra = (Deno.env.get("SHANGAI_SITIOS") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
function origenValido(o: unknown): string | null {
  if (typeof o !== "string") return null;
  try {
    const u = new URL(o);
    const base = `${u.protocol}//${u.host}`;
    if (extra.includes(base)) return base;
    if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(u.hostname)) return base;
    if (u.protocol === "https:" && /(^|\.)vercel\.app$/.test(u.hostname)) return base;
    if (u.protocol === "https:" && /(^|\.)imposhangai\.com$/.test(u.hostname)) return base;
    return null;
  } catch {
    return null;
  }
}

type ItemPedido = { producto_id: string | null; codigo: string; nombre: string; imagen: string | null; precio_unitario: number; cantidad: number };
type PedidoCreado = {
  id: string;
  numero: number;
  token: string;
  total: number;
  costo_envio: number | null;
  descuento: number;
  metodo_pago: string;
  cliente: { nombre: string; email: string | null; telefono: string };
  items: ItemPedido[];
};

/** Foto chica del ítem para el checkout de Mercado Pago (estáticas en el sitio, o en el bucket). */
function fotoItem(imagen: string | null, origen: string | null) {
  if (!imagen) return null;
  const chica = imagen.replace(/\.webp$/, "-sm.webp");
  if (imagen.startsWith("/")) return origen && origen.startsWith("https://") ? origen + chica : null;
  return STORAGE_URL + chica;
}

async function crearPreferencia(p: PedidoCreado, origen: string | null): Promise<{ id: string; init_point: string }> {
  const { data: cred, error } = await admin.rpc("mp_credenciales");
  const token = (cred as { access_token?: string } | null)?.access_token;
  if (error || !token) throw new Error("Mercado Pago no está conectado. Elegí otro medio de pago o escribinos por WhatsApp.");

  const [nombre, ...resto] = p.cliente.nombre.trim().split(/\s+/);
  const items = p.items.map((i) => ({
    id: i.codigo,
    title: i.nombre.slice(0, 250),
    quantity: i.cantidad,
    unit_price: Number(i.precio_unitario),
    currency_id: "ARS",
    ...(fotoItem(i.imagen, origen) ? { picture_url: fotoItem(i.imagen, origen)! } : {}),
  }));
  if (p.costo_envio && Number(p.costo_envio) > 0) {
    items.push({ id: "envio", title: "Envío", quantity: 1, unit_price: Number(p.costo_envio), currency_id: "ARS" });
  }

  const cuerpo: Record<string, unknown> = {
    items,
    external_reference: p.id,
    notification_url: WEBHOOK_URL,
    statement_descriptor: "SHANGAI CENTER",
    metadata: { pedido_numero: p.numero, token: p.token },
    payer: {
      name: nombre,
      surname: resto.join(" ") || undefined,
      ...(p.cliente.email ? { email: p.cliente.email } : {}),
      phone: { area_code: "", number: p.cliente.telefono },
    },
  };
  if (origen) {
    const volver = `${origen}/pedido/${p.token}`;
    cuerpo.back_urls = { success: `${volver}?pago=ok`, pending: `${volver}?pago=pendiente`, failure: `${volver}?pago=error` };
    if (origen.startsWith("https://")) cuerpo.auto_return = "approved";
  }

  const r = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": `${p.id}-${Date.now()}`,
    },
    body: JSON.stringify(cuerpo),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d?.id) {
    console.error("MP preferencia", r.status, JSON.stringify(d).slice(0, 500));
    throw new Error("No pudimos iniciar el pago con Mercado Pago. Probá de nuevo en unos minutos o elegí otro medio de pago.");
  }
  const initPoint: string = token.startsWith("TEST-") ? d.sandbox_init_point ?? d.init_point : d.init_point;
  await admin.rpc("guardar_preferencia", { p_pedido: p.id, p_preference_id: d.id, p_init_point: initPoint });
  return { id: d.id, init_point: initPoint };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  if (Number(req.headers.get("content-length") ?? 0) > 200_000) return json({ error: "Pedido demasiado grande" }, 413);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Datos inválidos" }, 400);
  }
  const accion = String(body.accion ?? "crear");
  const origen = origenValido(body.origen);

  if (accion === "crear") {
    const items = Array.isArray(body.items) ? body.items : [];
    const datos = {
      items: items.map((i) => ({ producto_id: (i as Record<string, unknown>).producto_id, cantidad: Number((i as Record<string, unknown>).cantidad) })),
      cliente: body.cliente ?? {},
      entrega: body.entrega ?? {},
      metodo_pago: body.metodo_pago,
      notas: typeof body.notas === "string" ? body.notas.slice(0, 1000) : null,
    };
    const { data, error } = await admin.rpc("crear_pedido", { p_datos: datos });
    if (error) {
      // Errores de negocio (P0001) vienen en castellano y se muestran tal cual.
      const negocio = error.code === "P0001";
      if (!negocio) console.error("crear_pedido", error);
      return json({ error: negocio ? error.message : "No pudimos registrar el pedido. Probá de nuevo." }, negocio ? 422 : 500);
    }
    const pedido = data as PedidoCreado;
    let init_point: string | null = null;
    let aviso: string | null = null;
    if (pedido.metodo_pago === "mercadopago") {
      try {
        init_point = (await crearPreferencia(pedido, origen)).init_point;
      } catch (e) {
        aviso = (e as Error).message;
      }
    }
    return json({ ok: true, token: pedido.token, numero: pedido.numero, total: pedido.total, init_point, aviso });
  }

  if (accion === "pagar") {
    const token = String(body.token ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(token)) return json({ error: "Pedido inválido" }, 400);
    const { data, error } = await admin.rpc("pedido_para_pago", { p_token: token });
    const p = data as (PedidoCreado & { estado: string; estado_pago: string }) | null;
    if (error || !p) return json({ error: "No encontramos el pedido" }, 404);
    if (p.metodo_pago !== "mercadopago") return json({ error: "Este pedido no se paga con Mercado Pago" }, 400);
    if (p.estado !== "pendiente" || !["pendiente", "rechazado", "cancelado"].includes(p.estado_pago)) {
      return json({ error: "Este pedido ya no tiene pagos pendientes" }, 409);
    }
    try {
      const pref = await crearPreferencia(p, origen);
      return json({ ok: true, init_point: pref.init_point });
    } catch (e) {
      return json({ error: (e as Error).message }, 502);
    }
  }

  return json({ error: "Acción desconocida" }, 400);
});
