import Link from "next/link";
import { ImagenProducto } from "@/components/ui/ImagenProducto";
import { Precio } from "@/components/ui/Precio";
import type { ProductoVista } from "@/lib/tienda";
import { BotonAgregarCompacto } from "../BotonAgregarCompacto";
import { TarjetaProducto } from "../TarjetaProducto";
import { Contenedor, TituloSeccion } from "../TituloSeccion";

export function Ranking({ productos }: { productos: ProductoVista[] }) {
  if (productos.length === 0) return null;
  const podio = productos.slice(0, 3);
  const resto = productos.slice(3, 10);
  return (
    <Contenedor className="mt-16 sm:mt-24">
      <TituloSeccion
        titulo="Más vendidos"
        bajada="Lo que más sale del local. El ranking se actualiza solo con cada venta confirmada."
        href="/mas-vendidos"
        accion="Ranking completo"
        id="titulo-ranking"
      />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <ol
          className="vidriera sin-scrollbar flex snap-x snap-mandatory overflow-x-auto sm:grid sm:grid-cols-3 sm:overflow-visible"
          aria-labelledby="titulo-ranking"
        >
          {podio.map((p, i) => (
            <li key={p.id} className="relative w-[46%] shrink-0 snap-start border-aluminio sm:w-auto [&:not(:last-child)]:border-r">
              <span
                aria-hidden="true"
                className="rotulo pointer-events-none absolute bottom-[5.25rem] right-2 z-0 select-none text-[5.5rem] leading-none text-transparent [-webkit-text-stroke:1.5px_var(--color-marca-200)] sm:text-[7rem]"
              >
                {i + 1}
              </span>
              <TarjetaProducto producto={p} puesto={i + 1} prioridad={false} className="relative z-[1] h-full bg-transparent" />
            </li>
          ))}
        </ol>
        <ol start={4} className="vidriera divide-y divide-aluminio">
          {resto.map((p, i) => (
            <li key={p.id} className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
              <span className="rotulo tabular w-7 shrink-0 text-center text-lg text-marca-300">{i + 4}</span>
              <Link href={`/producto/${p.slug}`} className="flex min-w-0 flex-1 items-center gap-3">
                <ImagenProducto ruta={p.imagenes[0]} alt="" className="size-14 shrink-0 rounded-xl border border-aluminio" />
                <span className="min-w-0">
                  <span className="line-clamp-2 text-[0.9rem] font-medium leading-snug text-tinta hover:underline">{p.nombre}</span>
                  <span className="tabular mt-0.5 block text-[0.72rem] text-tinta-3">Cód. {p.codigo}</span>
                </span>
              </Link>
              <Precio monto={p.precio_final} tam="sm" className="shrink-0" />
              <BotonAgregarCompacto p={p} />
            </li>
          ))}
        </ol>
      </div>
    </Contenedor>
  );
}
