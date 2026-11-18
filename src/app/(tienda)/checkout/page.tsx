import type { Metadata } from "next";
import { Checkout } from "@/components/tienda/checkout/Checkout";
import { Migas } from "@/components/tienda/PaginaListado";
import { Contenedor } from "@/components/tienda/TituloSeccion";

export const metadata: Metadata = { title: "Finalizar pedido", robots: { index: false } };

export default function PaginaCheckout() {
  return (
    <Contenedor className="pt-4 sm:pt-6">
      <Migas migas={[{ texto: "Inicio", href: "/" }, { texto: "Finalizar pedido" }]} />
      <h1 className="rotulo mt-4 mb-6 text-[clamp(1.7rem,4.5vw,2.75rem)] text-marca-700">Finalizar pedido</h1>
      <Checkout />
    </Contenedor>
  );
}
