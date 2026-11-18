import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

let cliente: ReturnType<typeof crear> | null = null;

function crear() {
  return createBrowserClient<Database, "shangai">(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { db: { schema: "shangai" } },
  );
}

/** Cliente del navegador (singleton). Usa la sesión guardada en cookies. */
export function createClient() {
  if (!cliente) cliente = crear();
  return cliente;
}
