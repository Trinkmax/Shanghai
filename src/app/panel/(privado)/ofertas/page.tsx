import type { Metadata } from "next";
import { GestorOfertas, type ProductoEnOferta } from "@/components/panel/ofertas/GestorOfertas";
import { TituloPagina } from "@/components/panel/ui";
import { marcaDeTiempo } from "@/lib/panel/fechas";
import { requerirPerfil } from "@/lib/panel/sesion";
import { createClient } from "@/lib/supabase/server";

// Pantalla con sesión: puede bloquear en el servidor al navegar (Cache Components).
export const instant = false;

export const metadata: Metadata = { title: "Ofertas" };

export default async function Ofertas() {
  await requerirPerfil("editar_catalogo");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("productos")
    .select("id, nombre, codigo, precio, precio_oferta, oferta_hasta, en_oferta, imagenes")
    .or("en_oferta.eq.true,precio_oferta.not.is.null")
    .order("nombre");
  if (error) throw new Error(error.message);
  const ahora = await marcaDeTiempo();
  const ofertas: ProductoEnOferta[] = (data ?? []).map((o) => ({
    ...o,
    precio: Number(o.precio),
    precio_oferta: o.precio_oferta == null ? null : Number(o.precio_oferta),
    vencida: Boolean(o.oferta_hasta && new Date(o.oferta_hasta).getTime() < ahora),
  }));
  return (
    <>
      <TituloPagina
        titulo="Ofertas"
        descripcion="Lo que pongas acá aparece en la banda de Ofertas de la portada y en su página. Las que tienen fecha se apagan solas."
      />
      <GestorOfertas ofertas={ofertas} />
    </>
  );
}
