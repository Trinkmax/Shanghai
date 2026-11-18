import type { Metadata } from "next";
import { Suspense } from "react";
import { EsqueletoListado, PaginaListado } from "@/components/tienda/PaginaListado";
import { esOrden } from "@/lib/datos/catalogo";

export const metadata: Metadata = {
  title: "Ofertas",
  description: "Ofertas de Shangai Center: precios mayoristas rebajados, mientras dure el stock.",
};

type SP = Promise<Record<string, string | string[] | undefined>>;
const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Contenido({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const orden = uno(sp.orden);
  return (
    <PaginaListado
      titulo="Ofertas"
      tono="ambar"
      bajada="Precios ya rebajados, mientras dure el stock."
      migas={[{ texto: "Inicio", href: "/" }, { texto: "Ofertas" }]}
      filtro={{ ofertas: true, novedades: uno(sp.novedades) === "1", orden: esOrden(orden) ? orden : "relevancia" }}
      ocultarFiltros={["ofertas"]}
    />
  );
}

export default function Ofertas({ searchParams }: { searchParams: SP }) {
  return (
    <Suspense fallback={<EsqueletoListado />}>
      <Contenido searchParams={searchParams} />
    </Suspense>
  );
}
