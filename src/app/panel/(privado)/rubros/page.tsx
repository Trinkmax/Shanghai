import type { Metadata } from "next";
import { ListaRubros, type Rubro } from "@/components/panel/rubros/ListaRubros";
import { TituloPagina } from "@/components/panel/ui";
import { requerirPerfil } from "@/lib/panel/sesion";
import { createClient } from "@/lib/supabase/server";

// Pantalla con sesión: puede bloquear en el servidor al navegar (Cache Components).
export const instant = false;

export const metadata: Metadata = { title: "Rubros" };

export default async function Rubros() {
  await requerirPerfil("editar_catalogo");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categorias")
    .select("id, slug, nombre, descripcion, icono, color, activa, orden, productos(count)")
    .order("orden");
  if (error) throw new Error(error.message);
  const rubros: Rubro[] = (data ?? []).map(({ productos, ...r }) => ({
    ...r,
    cantidad: (productos as unknown as { count: number }[])?.[0]?.count ?? 0,
  }));
  return (
    <>
      <TituloPagina
        titulo="Rubros"
        descripcion="El orden de esta lista es el orden de los letreros en la tienda. Usá las flechas para acomodarlos."
      />
      <ListaRubros rubros={rubros} />
    </>
  );
}
