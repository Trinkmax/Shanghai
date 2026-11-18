"use client";

import { Check, Plus } from "lucide-react";
import { useRef } from "react";
import { useCantidadDe, useCarritoHidratado } from "@/lib/carrito";
import type { ProductoVista } from "@/lib/tienda";
import { cn } from "@/lib/utils";
import { aCarrito } from "./TarjetaProducto";
import { useAgregar } from "./useAgregar";

/** "+" cuadrado para listas. Si ya está en el pedido, muestra cuántas unidades lleva. */
export function BotonAgregarCompacto({ p, className }: { p: ProductoVista; className?: string }) {
  const agregar = useAgregar();
  const hidratado = useCarritoHidratado();
  const cantidad = useCantidadDe(p.id);
  const ref = useRef<HTMLButtonElement>(null);
  const en = hidratado && cantidad > 0;
  if (p.agotado) return <span className="w-10 shrink-0 text-center text-[0.7rem] font-semibold text-tinta-3">Agotado</span>;
  return (
    <button
      ref={ref}
      type="button"
      onClick={() => agregar(aCarrito(p), undefined, ref.current)}
      className={cn(
        "presionable relative grid size-10 shrink-0 place-items-center rounded-xl",
        en ? "border border-marca-300 bg-marca-50 text-marca-700" : "cartel",
        className,
      )}
      aria-label={en ? `Sumar otra unidad de ${p.nombre} (llevás ${cantidad})` : `Agregar ${p.nombre} al pedido`}
    >
      {en ? (
        <span className="tabular text-sm font-bold">{cantidad}</span>
      ) : (
        <Plus className="size-[18px]" strokeWidth={2.5} />
      )}
      {en && (
        <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-marca-600 text-white">
          <Check className="size-2.5" strokeWidth={3.5} />
        </span>
      )}
    </button>
  );
}
