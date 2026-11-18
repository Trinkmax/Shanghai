import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Isotipo } from "@/components/marca/Isotipo";
import { FichaRubro } from "@/components/ui/IconoRubro";
import { listarProductos, type FiltroCatalogo } from "@/lib/datos/catalogo";
import { formatNumero } from "@/lib/format";
import { acrilico, type Categoria } from "@/lib/tienda";
import { cn } from "@/lib/utils";
import { BarraFiltros, ListadoProductos } from "./Listado";
import { Contenedor } from "./TituloSeccion";

export type Miga = { texto: string; href?: string };

export function Migas({ migas, className }: { migas: Miga[]; className?: string }) {
  return (
    <nav aria-label="Ubicación" className={cn("text-[0.82rem] text-tinta-3", className)}>
      <ol className="flex flex-wrap items-center gap-1">
        {migas.map((m, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="size-3.5 text-aluminio-2" aria-hidden="true" />}
            {m.href ? (
              <Link href={m.href} className="hover:text-tinta hover:underline">
                {m.texto}
              </Link>
            ) : (
              <span aria-current="page" className="text-tinta-2">
                {m.texto}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function EsqueletoListado() {
  return (
    <Contenedor className="pt-6">
      <div className="esqueleto h-4 w-40" />
      <div className="esqueleto mt-5 h-12 w-72 max-w-full" />
      <div className="mt-8 flex gap-2">
        <div className="esqueleto h-10 w-36" />
        <div className="esqueleto h-10 w-28" />
      </div>
      <div className="vidriera mt-4">
        <div className="vidriera-grilla grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="p-4">
              <div className="esqueleto aspect-square w-full rounded-xl" />
              <div className="esqueleto mt-4 h-3.5 w-5/6" />
              <div className="esqueleto mt-2 h-3.5 w-1/2" />
              <div className="esqueleto mt-4 h-10 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </Contenedor>
  );
}

export function SinResultados({ titulo, texto }: { titulo: string; texto: React.ReactNode }) {
  return (
    <div className="vidriera flex flex-col items-center px-6 py-16 text-center">
      <Isotipo className="size-16 text-aluminio" grosor={6} />
      <p className="mt-5 text-lg font-semibold text-tinta">{titulo}</p>
      <div className="mt-1.5 max-w-[42ch] text-[0.95rem] text-tinta-2">{texto}</div>
    </div>
  );
}

/** Página de listado completa: encabezado + filtros + grilla progresiva. */
export async function PaginaListado({
  titulo,
  bajada,
  migas,
  filtro,
  tono = "normal",
  rubro,
  ocultarFiltros = [],
  sinFiltros = false,
  puestos = false,
  lateral,
  vacio,
}: {
  titulo: string;
  bajada?: React.ReactNode;
  migas: Miga[];
  filtro: FiltroCatalogo;
  tono?: "normal" | "ambar" | "marca";
  rubro?: Pick<Categoria, "icono" | "color" | "nombre">;
  ocultarFiltros?: ("ofertas" | "novedades")[];
  sinFiltros?: boolean;
  puestos?: boolean;
  lateral?: React.ReactNode;
  vacio?: React.ReactNode;
}) {
  const lista = await listarProductos(filtro);
  const a = rubro ? acrilico(rubro.color) : null;

  const encabezado = (
    <header
      className={cn(
        "relative overflow-hidden rounded-[1.5rem] px-5 py-7 sm:px-8 sm:py-10",
        tono === "ambar" && "bg-[linear-gradient(165deg,#ffd03d_0%,#ffc21a_45%,#f5ad00_100%)]",
        tono === "marca" && "cartel",
        tono === "normal" && !a && "border border-aluminio bg-white",
      )}
      style={a ? { background: `linear-gradient(135deg, ${a.suave} 0%, #ffffff 70%)`, border: "1px solid var(--color-aluminio)" } : undefined}
    >
      {tono === "marca" && <span className="cartel-luz" />}
      <Migas
        migas={migas}
        className={cn(tono === "ambar" && "text-ambar-tinta/70 [&_a:hover]:text-ambar-tinta", tono === "marca" && "text-marca-200 [&_a:hover]:text-white [&_[aria-current]]:text-white")}
      />
      <div className="mt-4 flex items-center gap-4">
        {rubro && <FichaRubro icono={rubro.icono} color={rubro.color} tam="lg" />}
        <div className="min-w-0">
          <h1
            className={cn(
              "rotulo text-[clamp(1.75rem,5vw,3.25rem)]",
              tono === "ambar" ? "text-ambar-tinta" : tono === "marca" ? "text-white" : "text-marca-700",
            )}
          >
            {titulo}
          </h1>
          <p
            className={cn(
              "tabular mt-2 text-[0.95rem]",
              tono === "ambar" ? "text-ambar-tinta/80" : tono === "marca" ? "text-marca-100" : "text-tinta-2",
            )}
          >
            {bajada ?? `${formatNumero(lista.length)} ${lista.length === 1 ? "producto" : "productos"}`}
          </p>
        </div>
      </div>
    </header>
  );

  const cuerpo = (
    <div className="min-w-0">
      {!sinFiltros && <BarraFiltros total={lista.length} ocultar={ocultarFiltros} className="mb-3" />}
      <ListadoProductos
        key={JSON.stringify(filtro)}
        inicial={lista.slice(0, 48)}
        total={lista.length}
        filtro={filtro}
        puestos={puestos}
        vacio={
          vacio ?? (
            <SinResultados
              titulo="No hay productos con estos filtros"
              texto={
                <>
                  Probá sacar algún filtro o{" "}
                  <Link href="/catalogo" className="font-semibold text-marca-700 underline">
                    mirá todo el catálogo
                  </Link>
                  .
                </>
              }
            />
          )
        }
      />
    </div>
  );

  return (
    <Contenedor className="pt-4 sm:pt-6">
      {encabezado}
      <div className={cn("mt-5 sm:mt-6", lateral && "lg:grid lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-6")}>
        {lateral && <aside className="hidden lg:block">{lateral}</aside>}
        {cuerpo}
      </div>
    </Contenedor>
  );
}

/** Lista lateral de rubros (escritorio). */
export function LateralRubros({ categorias, activo }: { categorias: Categoria[]; activo?: string }) {
  return (
    <nav aria-label="Rubros" className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-2xl border border-aluminio bg-white p-2">
      <Link
        href="/catalogo"
        aria-current={!activo ? "page" : undefined}
        className="flex items-center justify-between rounded-xl px-3 py-2 text-[0.9rem] font-semibold text-tinta hover:bg-vidrio aria-[current=page]:bg-marca-50 aria-[current=page]:text-marca-800"
      >
        Todo el catálogo
      </Link>
      {categorias.map((c) => (
        <Link
          key={c.id}
          href={`/rubro/${c.slug}`}
          aria-current={activo === c.slug ? "page" : undefined}
          className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-[0.88rem] text-tinta-2 hover:bg-vidrio hover:text-tinta aria-[current=page]:bg-marca-50 aria-[current=page]:font-semibold aria-[current=page]:text-marca-800"
        >
          <FichaRubro icono={c.icono} color={c.color} tam="sm" className="size-7 rounded-lg [&_svg]:size-3.5" />
          <span className="flex-1 truncate">{c.nombre}</span>
          <span className="tabular text-xs text-tinta-3">{c.cantidad}</span>
        </Link>
      ))}
    </nav>
  );
}
