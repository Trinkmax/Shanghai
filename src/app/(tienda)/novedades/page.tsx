import type { Metadata } from "next";
import { Suspense } from "react";
import { EsqueletoListado, PaginaListado } from "@/components/tienda/PaginaListado";
import { esOrden } from "@/lib/datos/catalogo";

export const metadata: Metadata = {
  title: "Novedades",
  description: "Lo último que entró a Shangai Center, ya con precio mayorista.",
};

type SP = Promise<Record<string, string | string[] | undefined>>;
const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Contenido({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const orden = uno(sp.orden);
  return (
    <PaginaListado
      titulo="Recién llegados"
      bajada="Lo último que entró al local, ordenado de lo más nuevo a lo más viejo."
      migas={[{ texto: "Inicio", href: "/" }, { texto: "Novedades" }]}
      filtro={{ novedades: true, ofertas: uno(sp.ofertas) === "1", orden: esOrden(orden) ? orden : "nuevos" }}
      ocultarFiltros={["novedades"]}
    />
  );
}

export default function Novedades({ searchParams }: { searchParams: SP }) {
  return (
    <Suspense fallback={<EsqueletoListado />}>
      <Contenido searchParams={searchParams} />
    </Suspense>
  );
}
