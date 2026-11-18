import Link from "next/link";
import { LogoGrande } from "@/components/marca/Isotipo";
import type { Categoria, ConfigTienda, ProductoVista } from "@/lib/tienda";
import { CampoBuscar, PuertaMinimo } from "../PuertaMinimo";
import { TarjetaProducto } from "../TarjetaProducto";

const POPULARES = ["navidad", "verano", "iluminacion", "bazar", "parlantes-radios"];

export function Vidriera({
  config,
  categorias,
  destacados,
}: {
  config: ConfigTienda;
  categorias: Categoria[];
  destacados: ProductoVista[];
}) {
  const chips = POPULARES.map((s) => categorias.find((c) => c.slug === s)).filter(Boolean) as Categoria[];
  const hayEnvio = config.envios.some((e) => e.id !== "retiro" && e.activo);
  const exhibidos = destacados.slice(0, 6);

  return (
    <section aria-labelledby="titulo-vidriera" className="px-2 pt-3 sm:px-3 sm:pt-4">
      <div className="vidriera mx-auto grid max-w-[1440px] grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.22fr)]">
        {/* Paño de vidrio con las letras de vinilo */}
        <div className="@container relative flex min-w-0 flex-col overflow-hidden lg:justify-center bg-[linear-gradient(118deg,#ffffff_0%,#f6f7fb_55%,#eef0f6_100%)] p-5 pb-6 sm:p-9 lg:p-12">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -left-24 top-0 h-full w-40 rotate-[18deg] bg-gradient-to-r from-transparent via-white/80 to-transparent"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-40 top-0 h-full w-16 rotate-[18deg] bg-gradient-to-r from-transparent via-white/60 to-transparent"
          />

          <h1 id="titulo-vidriera" className="relative">
            <span className="sr-only">Shangai Center, importador mayorista en Córdoba</span>
            <LogoGrande className="text-[clamp(1.85rem,10.6cqi,4.6rem)]" />
          </h1>
          <p className="relative mt-4 max-w-[46ch] text-[1rem] leading-relaxed text-tinta-2 sm:mt-6 sm:text-lg">
            Elegí, sumá cantidades y {config.mp_conectado ? "pagá online con Mercado Pago" : "confirmá tu pedido online"}.
            Retirás en {config.direccion}
            {hayEnvio ? " o coordinamos el envío." : "."}
          </p>

          <CampoBuscar className="relative mt-6 sm:mt-8" />

          <ul
            className="sin-scrollbar relative -mx-5 mt-4 flex items-center gap-x-5 overflow-x-auto px-5 text-[0.92rem] sm:mx-0 sm:px-0"
            aria-label="Rubros populares"
          >
            {chips.map((c) => (
              <li key={c.id} className="shrink-0">
                <Link
                  href={`/rubro/${c.slug}`}
                  className="font-medium text-tinta-2 underline decoration-aluminio-2 underline-offset-[0.3em] transition-colors hover:text-marca-700 hover:decoration-marca-400"
                >
                  {c.nombre}
                </Link>
              </li>
            ))}
          </ul>

          <PuertaMinimo className="relative mt-7 lg:mt-10 lg:max-w-md" />
        </div>

        {/* Exhibidor: productos reales detrás del vidrio, listos para sumar */}
        <div className="min-w-0 border-t border-aluminio bg-white lg:border-l lg:border-t-0">
          <div className="sin-scrollbar flex snap-x snap-mandatory overflow-x-auto lg:grid lg:grid-cols-3 lg:overflow-visible">
            {exhibidos.map((p, i) => (
              <div
                key={p.id}
                className="w-[58%] shrink-0 snap-start border-r border-aluminio sm:w-[38%] lg:w-auto lg:[&:nth-child(3n)]:border-r-0 lg:[&:nth-child(-n+3)]:border-b"
              >
                <TarjetaProducto producto={p} prioridad={i < 3} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
