import type { Metadata } from "next";
import { PaginaListado } from "@/components/tienda/PaginaListado";

export const metadata: Metadata = {
  title: "Más vendidos",
  description: "El ranking de lo que más sale en Shangai Center. Se actualiza con cada venta confirmada.",
};

export default function MasVendidos() {
  return (
    <PaginaListado
      titulo="Más vendidos"
      tono="marca"
      bajada="El ranking de lo que más sale del local. Se actualiza solo con cada venta confirmada."
      migas={[{ texto: "Inicio", href: "/" }, { texto: "Más vendidos" }]}
      filtro={{ vendidos: true, orden: "vendidos" }}
      sinFiltros
      puestos
    />
  );
}
