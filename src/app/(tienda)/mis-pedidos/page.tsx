import type { Metadata } from "next";
import { ListaMisPedidos } from "@/components/tienda/Locales";
import { Migas } from "@/components/tienda/PaginaListado";
import { Contenedor } from "@/components/tienda/TituloSeccion";

export const metadata: Metadata = { title: "Mis pedidos", robots: { index: false } };

export default function MisPedidos() {
  return (
    <Contenedor className="pt-4 sm:pt-6">
      <Migas migas={[{ texto: "Inicio", href: "/" }, { texto: "Mis pedidos" }]} />
      <h1 className="rotulo mt-4 text-[clamp(1.7rem,4.5vw,2.75rem)] text-marca-700">Mis pedidos</h1>
      <p className="mb-6 mt-2 text-tinta-2">Los pedidos que hiciste desde este dispositivo, con su estado actualizado.</p>
      <ListaMisPedidos />
    </Contenedor>
  );
}
