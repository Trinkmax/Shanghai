import type { Metadata } from "next";
import { ListaFavoritos } from "@/components/tienda/Locales";
import { Migas } from "@/components/tienda/PaginaListado";
import { Contenedor } from "@/components/tienda/TituloSeccion";

export const metadata: Metadata = { title: "Favoritos", robots: { index: false } };

export default function Favoritos() {
  return (
    <Contenedor className="pt-4 sm:pt-6">
      <Migas migas={[{ texto: "Inicio", href: "/" }, { texto: "Favoritos" }]} />
      <h1 className="rotulo mt-4 text-[clamp(1.7rem,4.5vw,2.75rem)] text-marca-700">Favoritos</h1>
      <p className="mb-6 mt-2 text-tinta-2">Lo que guardaste para tu próxima compra.</p>
      <ListaFavoritos />
    </Contenedor>
  );
}
