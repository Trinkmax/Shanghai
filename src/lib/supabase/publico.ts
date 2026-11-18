import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Cliente SIN cookies (rol anon) para leer el catálogo público dentro de
 * funciones `"use cache"`: no depende de la persona que mira, así que su
 * resultado se puede cachear y prerenderizar.
 */
export function clientePublico() {
  return createSupabaseClient<Database, "shangai">(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      db: { schema: "shangai" },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    },
  );
}
