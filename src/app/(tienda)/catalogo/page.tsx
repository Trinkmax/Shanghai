import type { Metadata } from "next";
import { Suspense } from "react";
import { EsqueletoListado, LateralRubros, PaginaListado } from "@/components/tienda/PaginaListado";
import { esOrden, obtenerCategorias, type FiltroCatalogo } from "@/lib/datos/catalogo";

export const metadata: Metadata = {
  title: "Catálogo",
  description: "Todo el catálogo de Shangai Center: más de 1.000 productos importados a precio mayorista.",
};

type SP = Promise<Record<string, string | string[] | undefined>>;
const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Contenido({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = uno(sp.q)?.trim().slice(0, 80) || undefined;
  const orden = uno(sp.orden);
  const filtro: FiltroCatalogo = {
    q,
    ofertas: uno(sp.ofertas) === "1",
    novedades: uno(sp.novedades) === "1",
    orden: esOrden(orden) ? orden : "relevancia",
  };
  const categorias = await obtenerCategorias();
  return (
    <PaginaListado
      titulo={q ? `“${q}”` : "Catálogo"}
      migas={[{ texto: "Inicio", href: "/" }, { texto: q ? "Búsqueda" : "Catálogo" }]}
      filtro={filtro}
      lateral={<LateralRubros categorias={categorias} />}
    />
  );
}

export default function Catalogo({ searchParams }: { searchParams: SP }) {
  return (
    <Suspense fallback={<EsqueletoListado />}>
      <Contenido searchParams={searchParams} />
    </Suspense>
  );
}
