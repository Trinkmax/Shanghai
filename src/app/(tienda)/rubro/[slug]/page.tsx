import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EsqueletoListado, LateralRubros, PaginaListado } from "@/components/tienda/PaginaListado";
import { esOrden, obtenerCategorias, type FiltroCatalogo } from "@/lib/datos/catalogo";

type Params = Promise<{ slug: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;
const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export async function generateStaticParams() {
  const categorias = await obtenerCategorias();
  return categorias.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const c = (await obtenerCategorias()).find((x) => x.slug === slug);
  if (!c) return { title: "Rubro no encontrado" };
  return {
    title: c.nombre,
    description: `${c.cantidad} productos de ${c.nombre.toLowerCase()} a precio mayorista en Shangai Center, Córdoba.`,
  };
}

async function Contenido({ params, searchParams }: { params: Params; searchParams: SP }) {
  const [{ slug }, sp, categorias] = await Promise.all([params, searchParams, obtenerCategorias()]);
  const c = categorias.find((x) => x.slug === slug);
  if (!c) notFound();
  const orden = uno(sp.orden);
  const filtro: FiltroCatalogo = {
    rubro: c.id,
    ofertas: uno(sp.ofertas) === "1",
    novedades: uno(sp.novedades) === "1",
    orden: esOrden(orden) ? orden : "relevancia",
  };
  return (
    <PaginaListado
      titulo={c.nombre}
      rubro={c}
      migas={[{ texto: "Inicio", href: "/" }, { texto: "Catálogo", href: "/catalogo" }, { texto: c.nombre }]}
      filtro={filtro}
      lateral={<LateralRubros categorias={categorias} activo={c.slug} />}
    />
  );
}

export default function Rubro({ params, searchParams }: { params: Params; searchParams: SP }) {
  return (
    <Suspense fallback={<EsqueletoListado />}>
      <Contenido params={params} searchParams={searchParams} />
    </Suspense>
  );
}
