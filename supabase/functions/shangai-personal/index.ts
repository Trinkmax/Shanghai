// shangai-personal — Cuentas del equipo de Shangai Center.
// Usa service_role internamente: el panel nunca ve esa key.
// Acciones:
//   inicializar  (sin sesión)  crea la PRIMERA cuenta de dueño con el código inicial (Vault).
//   crear | rol | activo | clave | eliminar   (solo dueño activo)
// Proyecto Supabase compartido con otras apps: si el email ya existe en auth.users,
// se VINCULA esa cuenta (no se cambia su contraseña ni se borra el usuario de auth).
import { createClient, type User } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const ROLES = ["dueno", "encargado", "vendedor"] as const;
type Rol = (typeof ROLES)[number];

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: "shangai" },
});

const emailValido = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);

async function buscarUsuarioPorEmail(email: string): Promise<User | null> {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const u = data.users.find((x) => (x.email ?? "").toLowerCase() === email);
    if (u) return u;
    if (data.users.length < 1000) return null;
  }
  return null;
}

/** Crea el usuario de auth o, si el email ya existe (otra app del proyecto), lo devuelve. */
async function crearOVincular(email: string, password: string, nombre: string) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: nombre, shangai: true },
  });
  if (!error && data?.user) return { id: data.user.id, vinculado: false };
  const m = `${error?.message ?? ""} ${(error as { code?: string } | null)?.code ?? ""}`.toLowerCase();
  if (m.includes("already") || m.includes("exists") || m.includes("registered")) {
    const existente = await buscarUsuarioPorEmail(email);
    if (existente) return { id: existente.id, vinculado: true };
  }
  throw new Error("No se pudo crear la cuenta. Revisá el email y probá de nuevo.");
}

async function duenosActivos(excepto?: string) {
  let q = admin.from("personal").select("id", { count: "exact", head: true }).eq("rol", "dueno").eq("activo", true);
  if (excepto) q = q.neq("id", excepto);
  const { count } = await q;
  return count ?? 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Cuerpo inválido" }, 400);
  }
  const accion = String(body.accion ?? "");

  try {
    // ------------------------------------------------------------ INICIALIZAR
    if (accion === "inicializar") {
      const codigo = String(body.codigo ?? "").trim().toUpperCase();
      const nombre = String(body.nombre ?? "").trim();
      const email = String(body.email ?? "").trim().toLowerCase();
      const password = String(body.password ?? "");
      if (nombre.length < 2) return json({ error: "Ingresá tu nombre." }, 400);
      if (!emailValido(email)) return json({ error: "El email no parece válido." }, 400);
      if (password.length < 8) return json({ error: "La contraseña debe tener al menos 8 caracteres." }, 400);

      const { data: valido, error: eCod } = await admin.rpc("validar_codigo_inicial", { p_codigo: codigo });
      if (eCod) throw eCod;
      if (!valido) {
        if ((await duenosActivos()) > 0) {
          return json({ error: "Ya hay una cuenta de dueño creada. Ingresá con tu email y contraseña." }, 409);
        }
        return json({ error: "El código inicial no es válido. Revisalo (distingue el formato SHANG-XXXX-XXXX)." }, 403);
      }

      const { id, vinculado } = await crearOVincular(email, password, nombre);
      const { error } = await admin
        .from("personal")
        .upsert({ id, nombre, email, rol: "dueno", activo: true }, { onConflict: "id" });
      if (error) throw error;
      return json({ ok: true, vinculado });
    }

    // ----------------------------------------------------- resto: solo dueño
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Tenés que iniciar sesión." }, 401);
    const { data: u } = await admin.auth.getUser(token);
    const uid = u?.user?.id;
    if (!uid) return json({ error: "Tu sesión venció. Volvé a ingresar." }, 401);

    const { data: yo } = await admin.from("personal").select("id, rol, activo").eq("id", uid).maybeSingle();
    if (!yo || !yo.activo || yo.rol !== "dueno") return json({ error: "Solo el dueño puede administrar el equipo." }, 403);

    // ----------------------------------------------------------------- CREAR
    if (accion === "crear") {
      const nombre = String(body.nombre ?? "").trim();
      const email = String(body.email ?? "").trim().toLowerCase();
      const password = String(body.password ?? "");
      const rol = String(body.rol ?? "vendedor") as Rol;
      if (nombre.length < 2) return json({ error: "Ingresá el nombre completo." }, 400);
      if (!emailValido(email)) return json({ error: "El email no parece válido." }, 400);
      if (password.length < 8) return json({ error: "La contraseña debe tener al menos 8 caracteres." }, 400);
      if (!ROLES.includes(rol)) return json({ error: "Rol inválido." }, 400);

      const { id, vinculado } = await crearOVincular(email, password, nombre);
      const { data: ya } = await admin.from("personal").select("id").eq("id", id).maybeSingle();
      if (ya) return json({ error: "Esa persona ya está en el equipo." }, 409);
      const { error } = await admin.from("personal").insert({ id, nombre, email, rol, activo: true });
      if (error) throw error;
      return json({ ok: true, id, vinculado });
    }

    const id = String(body.id ?? "");
    if (!id) return json({ error: "Falta indicar la persona." }, 400);
    const { data: destino } = await admin.from("personal").select("id, rol, activo").eq("id", id).maybeSingle();
    if (!destino) return json({ error: "Esa persona no está en el equipo." }, 404);

    // ------------------------------------------------------------------- ROL
    if (accion === "rol") {
      const rol = String(body.rol ?? "") as Rol;
      if (!ROLES.includes(rol)) return json({ error: "Rol inválido." }, 400);
      if (id === uid) return json({ error: "No podés cambiar tu propio rol." }, 400);
      if (destino.rol === "dueno" && rol !== "dueno" && (await duenosActivos(id)) < 1) {
        return json({ error: "Tiene que quedar al menos un dueño activo." }, 400);
      }
      const { error } = await admin.from("personal").update({ rol }).eq("id", id);
      if (error) throw error;
      return json({ ok: true });
    }

    // ---------------------------------------------------------------- ACTIVO
    if (accion === "activo") {
      const activo = Boolean(body.activo);
      if (!activo && id === uid) return json({ error: "No podés desactivar tu propia cuenta." }, 400);
      if (!activo && destino.rol === "dueno" && (await duenosActivos(id)) < 1) {
        return json({ error: "Tiene que quedar al menos un dueño activo." }, 400);
      }
      const { error } = await admin.from("personal").update({ activo }).eq("id", id);
      if (error) throw error;
      return json({ ok: true });
    }

    // ----------------------------------------------------------------- CLAVE
    if (accion === "clave") {
      const password = String(body.password ?? "");
      if (password.length < 8) return json({ error: "La contraseña debe tener al menos 8 caracteres." }, 400);
      const { error } = await admin.auth.admin.updateUserById(id, { password });
      if (error) return json({ error: "No se pudo cambiar la contraseña." }, 400);
      return json({ ok: true });
    }

    // -------------------------------------------------------------- ELIMINAR
    // Quita el acceso al panel. NO borra el usuario de auth (puede usarse en otra app del proyecto).
    if (accion === "eliminar") {
      if (id === uid) return json({ error: "No podés quitarte a vos mismo del equipo." }, 400);
      if (destino.rol === "dueno" && destino.activo && (await duenosActivos(id)) < 1) {
        return json({ error: "Tiene que quedar al menos un dueño activo." }, 400);
      }
      const { error } = await admin.from("personal").delete().eq("id", id);
      if (error) throw error;
      return json({ ok: true });
    }

    return json({ error: "Acción desconocida" }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e);
    console.error("shangai-personal", accion, msg);
    return json({ error: msg.startsWith("No se pudo") ? msg : "Ocurrió un error inesperado. Probá de nuevo." }, 500);
  }
});
