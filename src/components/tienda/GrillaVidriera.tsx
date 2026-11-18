import type { ProductoVista } from "@/lib/tienda";
import { cn } from "@/lib/utils";
import { TarjetaProducto } from "./TarjetaProducto";

/** Paño de vidriera: productos separados por perfiles de aluminio, dentro de un marco. */
export function GrillaVidriera({
  productos,
  className,
  columnas = "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
  prioridad = 0,
  puestos = false,
}: {
  productos: ProductoVista[];
  className?: string;
  columnas?: string;
  prioridad?: number;
  puestos?: boolean;
}) {
  return (
    <div className={cn("vidriera", className)}>
      <div className={cn("vidriera-grilla", columnas)}>
        {productos.map((p, i) => (
          <TarjetaProducto key={p.id} producto={p} prioridad={i < prioridad} puesto={puestos ? i + 1 : undefined} />
        ))}
      </div>
    </div>
  );
}

/** Fila deslizable (celular) que se vuelve grilla en pantallas grandes. */
export function FilaVidriera({ productos, className }: { productos: ProductoVista[]; className?: string }) {
  return (
    <div className={cn("vidriera", className)}>
      <div className="sin-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain md:grid md:grid-cols-4 md:overflow-visible lg:grid-cols-6">
        {productos.map((p) => (
          <div
            key={p.id}
            className="w-[46%] shrink-0 snap-start border-r border-aluminio last:border-r-0 sm:w-[32%] md:w-auto md:[&:nth-child(4n)]:border-r-0 lg:[&:nth-child(4n)]:border-r lg:[&:nth-child(6n)]:border-r-0"
          >
            <TarjetaProducto producto={p} />
          </div>
        ))}
      </div>
    </div>
  );
}
