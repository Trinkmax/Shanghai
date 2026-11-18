import Link from "next/link";
import { FichaRubro } from "@/components/ui/IconoRubro";
import type { Categoria, ConfigTienda, ProductoVista } from "@/lib/tienda";
import { formatNumero } from "@/lib/format";
import { CampoBuscar, PuertaMinimo } from "../PuertaMinimo";
import { TarjetaProducto } from "../TarjetaProducto";

const POPULARES = ["navidad", "verano", "iluminacion", "bazar", "parlantes-radios"];

export function Vidriera({
  config,
  categorias,
  destacados,
  total,
}: {
  config: ConfigTienda;
  categorias: Categoria[];
  destacados: ProductoVista[];
  total: number;
}) {
  const redondo = total >= 100 ? Math.floor(total / 100) * 100 : total;
  const chips = POPULARES.map((s) => categorias.find((c) => c.slug === s)).filter(Boolean) as Categoria[];
  const hayEnvio = config.envios.some((e) => e.id !== "retiro" && e.activo);
  const exhibidos = destacados.slice(0, 6);

  return (
    <section aria-labelledby="titulo-vidriera" className="px-2 pt-3 sm:px-3 sm:pt-4">
      <div className="vidriera mx-auto grid max-w-[1440px] grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.22fr)]">
        {/* Paño de vidrio con las letras de vinilo */}
        <div className="@container relative flex min-w-0 flex-col overflow-hidden bg-[linear-gradient(118deg,#ffffff_0%,#f6f7fb_55%,#eef0f6_100%)] p-5 pb-6 sm:p-9 lg:p-12">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -left-24 top-0 h-full w-40 rotate-[18deg] bg-gradient-to-r from-transparent via-white/80 to-transparent"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-40 top-0 h-full w-16 rotate-[18deg] bg-gradient-to-r from-transparent via-white/60 to-transparent"
          />

          <h1
            id="titulo-vidriera"
            className="rotulo relative text-[clamp(1.7rem,11.2cqi,4.25rem)] text-marca-700 [text-shadow:0_1px_0_rgb(255_255_255/0.9)]"
          >
            Más de {formatNumero(redondo)} importados <span className="text-marca-500">a precio mayorista</span>
          </h1>
          <p className="relative mt-4 max-w-[46ch] text-[1rem] leading-relaxed text-tinta-2 sm:mt-6 sm:text-lg">
            Elegí, sumá cantidades y {config.mp_conectado ? "pagá online con Mercado Pago" : "confirmá tu pedido online"}.
            Retirás en {config.direccion}
            {hayEnvio ? " o coordinamos el envío." : "."}
          </p>

          <CampoBuscar className="relative mt-6 sm:mt-8" />

          <ul className="sin-scrollbar relative -mx-5 mt-4 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Rubros populares">
            {chips.map((c) => (
              <li key={c.id} className="shrink-0">
                <Link
                  href={`/rubro/${c.slug}`}
                  className="presionable inline-flex h-10 items-center gap-2 rounded-xl border border-aluminio bg-white/80 pl-1.5 pr-3 text-[0.88rem] font-medium text-tinta transition-colors hover:border-marca-300 hover:bg-white"
                >
                  <FichaRubro icono={c.icono} color={c.color} tam="sm" className="size-7 rounded-lg [&_svg]:size-3.5" />
                  {c.nombre}
                </Link>
              </li>
            ))}
          </ul>

          <PuertaMinimo className="relative mt-7 lg:mt-auto lg:max-w-md" />
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
