import type { Metadata } from "next";
import { Armazon } from "@/components/panel/Armazon";
import { requerirPerfil } from "@/lib/panel/sesion";
import { createClient } from "@/lib/supabase/server";

// El panel depende de la sesión: puede bloquear en el servidor al navegar hacia acá.
export const instant = false;

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s · Panel Shangai" },
  robots: { index: false, follow: false },
};

export default async function LayoutPanel({ children }: { children: React.ReactNode }) {
  const perfil = await requerirPerfil();
  const supabase = await createClient();
  const { count } = await supabase
    .from("pedidos")
    .select("id", { count: "exact", head: true })
    .in("estado", ["pendiente", "confirmado", "preparando", "listo"])
    .neq("canal", "mostrador");

  return (
    <Armazon nombre={perfil.nombre} rol={perfil.rol} pendientesIniciales={count ?? 0}>
      {children}
    </Armazon>
  );
}
