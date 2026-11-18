import type { Metadata } from "next";
import { GestorRanking, type ItemRanking } from "@/components/panel/ranking/GestorRanking";
import { TituloPagina } from "@/components/panel/ui";
import { requerirPerfil } from "@/lib/panel/sesion";
import { createClient } from "@/lib/supabase/server";

// Pantalla con sesión: puede bloquear en el servidor al navegar (Cache Components).
export const instant = false;

export const metadata: Metadata = { title: "Más vendidos" };

export default async function MasVendidos() {
  await requerirPerfil("editar_catalogo");
  const supabase = await createClient();
  const columnas = "id, nombre, codigo, precio, precio_oferta, imagenes, vendidos";
  const [fijados, porVentas] = await Promise.all([
    supabase.from("productos").select(columnas).not("ranking_vendidos", "is", null).order("ranking_vendidos"),
    supabase.from("productos").select(columnas).is("ranking_vendidos", null).gt("vendidos", 0).eq("activo", true).order("vendidos", { ascending: false }).limit(12),
  ]);
  const aItem = (p: NonNullable<typeof fijados.data>[number]): ItemRanking => ({
    id: p.id,
    nombre: p.nombre,
    codigo: p.codigo,
    precio: Number(p.precio_oferta ?? p.precio),
    imagen: p.imagenes[0] ?? null,
    vendidos: p.vendidos,
  });
  return (
    <>
      <TituloPagina
        titulo="Más vendidos"
        descripcion="El ranking de la tienda combina los puestos que fijes acá con las ventas reales: con cada venta confirmada se actualiza solo."
      />
      <GestorRanking fijados={(fijados.data ?? []).map(aItem)} porVentas={(porVentas.data ?? []).map(aItem)} />
    </>
  );
}
