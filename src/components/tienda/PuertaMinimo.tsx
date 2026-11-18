"use client";

import { ArrowRight, Search } from "lucide-react";
import { subtotalDe, useCarrito, useCarritoHidratado } from "@/lib/carrito";
import { formatARS } from "@/lib/format";
import { useUI } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { useTienda } from "./ContextoTienda";
import { CajaProgreso } from "./MedidorMinimo";

/** Calco de la puerta: la compra mínima, en vivo con lo que vas sumando. */
export function PuertaMinimo({ className }: { className?: string }) {
  const { compra_minima } = useTienda();
  const hidratado = useCarritoHidratado();
  const subtotal = useCarrito((s) => (hidratado ? subtotalDe(s.items) : 0));
  const abrir = useCarrito((s) => s.abrir);
  const falta = Math.max(0, compra_minima - subtotal);
  const empezo = subtotal > 0;

  return (
    <button
      type="button"
      onClick={abrir}
      className={cn(
        "presionable group flex w-full items-center gap-4 rounded-2xl border border-aluminio bg-white/90 p-3.5 pr-4 text-left shadow-[var(--shadow-pane)] backdrop-blur-[2px] transition-colors hover:border-marca-300",
        className,
      )}
    >
      <CajaProgreso progreso={subtotal / compra_minima} className="size-12" />
      <span className="min-w-0 flex-1">
        <span className="block text-[0.98rem] font-semibold text-tinta">
          {!empezo ? (
            <>
              Compra mínima <span className="tabular">{formatARS(compra_minima)}</span>
            </>
          ) : falta > 0 ? (
            <>
              Te faltan <span className="tabular">{formatARS(falta)}</span>
            </>
          ) : (
            <>Ya llegaste al mínimo</>
          )}
        </span>
        <span className="mt-0.5 block text-[0.8rem] text-tinta-3">
          {!empezo ? "La caja se completa a medida que sumás productos." : `Llevás ${formatARS(subtotal)} · ver tu pedido`}
        </span>
      </span>
      <ArrowRight className="size-5 shrink-0 text-tinta-3 transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:text-marca-600" />
    </button>
  );
}

/** Campo de búsqueda de la vidriera: abre el buscador instantáneo. */
export function CampoBuscar({ className }: { className?: string }) {
  const abrir = useUI((s) => s.abrirBuscador);
  return (
    <button
      type="button"
      onClick={abrir}
      className={cn(
        "group flex h-14 w-full items-center gap-3 rounded-2xl border border-aluminio-2 bg-white px-4 text-left shadow-[0_1px_2px_rgb(22_20_44/0.06)] transition-[border-color,box-shadow] duration-150 hover:border-marca-400 hover:shadow-[0_0_0_4px_rgb(92_99_170/0.14)] sm:h-16 sm:px-5",
        className,
      )}
    >
      <Search className="size-5 text-marca-500 sm:size-6" />
      <span className="flex-1 truncate text-[1rem] text-tinta-3 sm:text-[1.08rem]">Buscá por nombre o código…</span>
      <span className="cartel hidden h-10 items-center rounded-xl px-4 text-sm font-semibold sm:inline-flex">Buscar</span>
    </button>
  );
}
