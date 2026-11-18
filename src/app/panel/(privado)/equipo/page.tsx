import type { Metadata } from "next";
import { GestorEquipo, type Persona } from "@/components/panel/equipo/GestorEquipo";
import { TituloPagina } from "@/components/panel/ui";
import { requerirPerfil } from "@/lib/panel/sesion";
import { createClient } from "@/lib/supabase/server";

// Pantalla con sesión: puede bloquear en el servidor al navegar (Cache Components).
export const instant = false;

export const metadata: Metadata = { title: "Equipo" };

export default async function Equipo() {
  const perfil = await requerirPerfil("equipo");
  const supabase = await createClient();
  const { data, error } = await supabase.from("personal").select("id, nombre, email, rol, activo").order("activo", { ascending: false }).order("nombre");
  if (error) throw new Error(error.message);
  return (
    <>
      <TituloPagina
        titulo="Equipo"
        descripcion="Quién entra al panel y qué puede hacer. Cada persona entra con su email; vos le generás la contraseña."
      />
      <GestorEquipo personas={(data ?? []) as Persona[]} yo={perfil.id} />
    </>
  );
}
