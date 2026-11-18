// shangai-mp — Conexión de la cuenta de Mercado Pago del negocio.
// El access token se valida contra la API de MP y se guarda en Vault (nunca vuelve al navegador).
// Acciones: conectar | desconectar (solo dueño) · probar | estado (dueño o encargado)
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MP = "https://api.mercadopago.com";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: "shangai" },
});

type CuentaMP = { id: number; nickname: string; email: string; site_id: string; nombre: string; prueba: boolean };

async function consultarCuenta(token: string): Promise<{ ok: true; cuenta: CuentaMP } | { ok: false; error: string }> {
  let r: Response;
  try {
    r = await fetch(`${MP}/users/me`, { headers: { Authorization: `Bearer ${token}` } });
  } catch {
    return { ok: false, error: "No pudimos comunicarnos con Mercado Pago. Probá en unos minutos." };
  }
  if (r.status === 401 || r.status === 403) {
    return { ok: false, error: "El Access Token no es válido o fue revocado. Copialo de nuevo desde Mercado Pago Developers." };
  }
  if (!r.ok) return { ok: false, error: `Mercado Pago respondió con un error (${r.status}). Probá de nuevo.` };
  const u = await r.json();
  const tags: string[] = Array.isArray(u.tags) ? u.tags : [];
  return {
    ok: true,
    cuenta: {
      id: u.id,
      nickname: u.nickname ?? "",
      email: u.email ?? "",
      site_id: u.site_id ?? "",
      nombre: [u.first_name, u.last_name].filter(Boolean).join(" "),
      prueba: tags.includes("test_user") || Boolean(u.test_data),
    },
  };
}

async function leerToken(): Promise<string | null> {
  const { data, error } = await admin.rpc("mp_credenciales");
  if (error) throw error;
  return (data as { access_token?: string | null } | null)?.access_token ?? null;
}

async function estadoPublico() {
  const { data } = await admin
    .from("mercadopago")
    .select("conectado, public_key, cuenta, modo, webhook_secreto, conectado_en, ultimo_error")
    .eq("id", true)
    .maybeSingle();
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Tenés que iniciar sesión." }, 401);
  const { data: u } = await admin.auth.getUser(token);
  const uid = u?.user?.id;
  if (!uid) return json({ error: "Tu sesión venció. Volvé a ingresar." }, 401);
  const { data: yo } = await admin.from("personal").select("rol, activo").eq("id", uid).maybeSingle();
  if (!yo || !yo.activo || !["dueno", "encargado"].includes(yo.rol)) {
    return json({ error: "No tenés permiso para ver la conexión de pagos." }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Cuerpo inválido" }, 400);
  }
  const accion = String(body.accion ?? "");
  const soloDueno = () => json({ error: "Solo el dueño puede cambiar la conexión con Mercado Pago." }, 403);

  try {
    // ---------------------------------------------------------------- ESTADO
    if (accion === "estado") {
      return json({ ok: true, estado: await estadoPublico(), hay_token: Boolean(await leerToken()) });
    }

    // -------------------------------------------------------------- CONECTAR
    if (accion === "conectar") {
      if (yo.rol !== "dueno") return soloDueno();
      const accessToken = String(body.access_token ?? "").trim();
      const publicKey = String(body.public_key ?? "").trim();
      const secreto = String(body.webhook_secret ?? "").trim();
      if (!/^(APP_USR|TEST)-[\w-]{20,}$/.test(accessToken)) {
        return json({ error: "El Access Token tiene que empezar con APP_USR- (producción) o TEST- (prueba)." }, 400);
      }
      if (!/^(APP_USR|TEST)-[\w-]{20,}$/.test(publicKey)) {
        return json({ error: "La Public Key tiene que empezar con APP_USR- o TEST-." }, 400);
      }
      if (accessToken.split("-")[0] !== publicKey.split("-")[0]) {
        return json({ error: "La Public Key y el Access Token no son del mismo tipo (uno es de prueba y el otro de producción)." }, 400);
      }

      const r = await consultarCuenta(accessToken);
      if (!r.ok) return json({ error: r.error }, 400);
      if (r.cuenta.site_id && r.cuenta.site_id !== "MLA") {
        return json({ error: `Esa cuenta es de otro país (${r.cuenta.site_id}). Usá una cuenta de Mercado Pago Argentina.` }, 400);
      }

      const { error: eV } = await admin.rpc("mp_guardar_credenciales", {
        p_access_token: accessToken,
        p_webhook_secret: secreto || null,
      });
      if (eV) throw eV;

      const anterior = await estadoPublico();
      const modo = accessToken.startsWith("TEST-") || r.cuenta.prueba ? "prueba" : "produccion";
      const { error: eM } = await admin.from("mercadopago").upsert(
        {
          id: true,
          conectado: true,
          public_key: publicKey,
          cuenta: r.cuenta,
          modo,
          webhook_secreto: Boolean(secreto) || Boolean(anterior?.webhook_secreto),
          conectado_en: new Date().toISOString(),
          conectado_por: uid,
          ultimo_error: null,
        },
        { onConflict: "id" },
      );
      if (eM) throw eM;
      const { error: eC } = await admin.from("configuracion").update({ mp_conectado: true }).eq("id", true);
      if (eC) throw eC;
      return json({ ok: true, cuenta: r.cuenta, modo });
    }

    // ---------------------------------------------------------------- PROBAR
    if (accion === "probar") {
      const t = await leerToken();
      if (!t) return json({ ok: false, error: "No hay una cuenta de Mercado Pago conectada." }, 400);
      const r = await consultarCuenta(t);
      await admin.from("mercadopago").update({ ultimo_error: r.ok ? null : r.error }).eq("id", true);
      if (!r.ok) return json({ ok: false, error: r.error }, 400);
      return json({ ok: true, cuenta: r.cuenta });
    }

    // ----------------------------------------------------------- DESCONECTAR
    if (accion === "desconectar") {
      if (yo.rol !== "dueno") return soloDueno();
      const { error: eB } = await admin.rpc("mp_borrar_credenciales");
      if (eB) throw eB;
      await admin
        .from("mercadopago")
        .update({ conectado: false, public_key: null, cuenta: null, modo: null, webhook_secreto: false, ultimo_error: null })
        .eq("id", true);
      const { error: eC } = await admin.from("configuracion").update({ mp_conectado: false }).eq("id", true);
      if (eC) throw eC;
      return json({ ok: true });
    }

    return json({ error: "Acción desconocida" }, 400);
  } catch (e) {
    console.error("shangai-mp", accion, e);
    return json({ error: "Ocurrió un error inesperado. Probá de nuevo." }, 500);
  }
});
