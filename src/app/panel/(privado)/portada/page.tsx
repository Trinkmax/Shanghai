import type { Metadata } from "next";
import { GestorPortada, type Banner, type Destacado } from "@/components/panel/portada/GestorPortada";
import { TituloPagina } from "@/components/panel/ui";
import { requerirPerfil } from "@/lib/panel/sesion";
import { createClient } from "@/lib/supabase/server";

// Pantalla con sesión: puede bloquear en el servidor al navegar (Cache Components).
export const instant = false;

export const metadata: Metadata = { title: "Portada" };

export default async function Portada() {
  await requerirPerfil("editar_portada");
  const supabase = await createClient();
  const [banners, destacados] = await Promise.all([
    supabase.from("banners").select("id, titulo, bajada, cta_texto, cta_href, tono, activo, desde, hasta").order("orden"),
    supabase.from("productos").select("id, nombre, codigo, imagenes").eq("destacado", true).order("orden"),
  ]);
  if (banners.error) throw new Error(banners.error.message);
  return (
    <>
      <TituloPagina titulo="Portada" descripcion="Lo primero que ve un cliente al entrar: los carteles de temporada y los productos de la vidriera." />
      <GestorPortada
        banners={(banners.data ?? []) as Banner[]}
        destacados={(destacados.data ?? []).map((d): Destacado => ({ id: d.id, nombre: d.nombre, codigo: d.codigo, imagen: d.imagenes[0] ?? null }))}
      />
    </>
  );
}
