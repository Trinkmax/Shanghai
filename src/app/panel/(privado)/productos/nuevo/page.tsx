import type { Metadata } from "next";
import { FormProducto } from "@/components/panel/productos/FormProducto";
import { TituloPagina } from "@/components/panel/ui";
import { requerirPerfil } from "@/lib/panel/sesion";
import { createClient } from "@/lib/supabase/server";

// Pantalla con sesión: puede bloquear en el servidor al navegar (Cache Components).
export const instant = false;

export const metadata: Metadata = { title: "Nuevo producto" };

export default async function NuevoProducto({ searchParams }: { searchParams: Promise<{ rubro?: string }> }) {
  await requerirPerfil("editar_catalogo");
  const { rubro } = await searchParams;
  const supabase = await createClient();
  const { data: rubros } = await supabase.from("categorias").select("id, nombre").order("orden");
  return (
    <>
      <TituloPagina volver={{ href: "/panel/productos", texto: "Productos" }} titulo="Nuevo producto" />
      <FormProducto
        rubros={rubros ?? []}
        inicial={{
          nombre: "",
          codigo: "",
          categoria_id: rubro && /^\d+$/.test(rubro) ? Number(rubro) : null,
          precio: null,
          precio_oferta: null,
          oferta_hasta: null,
          en_oferta: false,
          stock: null,
          cantidad_minima: 1,
          descripcion: null,
          es_novedad: true,
          destacado: false,
          activo: true,
          ranking_vendidos: null,
          imagenes: [],
        }}
      />
    </>
  );
}
