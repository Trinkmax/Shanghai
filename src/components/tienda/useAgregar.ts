"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { subtotalDe, useCarrito, type ProductoParaCarrito } from "@/lib/carrito";
import { formatARS } from "@/lib/format";
import { urlImagen } from "@/lib/imagenes";
import { useTienda } from "./ContextoTienda";
import { avisarAgregado, volarAlCarrito } from "./eventos";

/** Agrega al pedido y coordina la respuesta visual (vuelo la 1ª vez, latido del contador, avisos). */
export function useAgregar() {
  const { compra_minima } = useTienda();

  return useCallback(
    (p: ProductoParaCarrito, cantidad?: number, origen?: HTMLElement | null) => {
      const estado = useCarrito.getState();
      const primeraVez = estado.items.length === 0 && !estado.yaVolo;
      const r = estado.agregar(p, cantidad);
      const rect = origen?.getBoundingClientRect() ?? null;

      if (primeraVez && rect) {
        volarAlCarrito(rect, urlImagen(p.imagen, "sm"));
        useCarrito.getState().marcarVuelo();
      }
      avisarAgregado({ origen: rect, imagen: p.imagen });

      if (r.tope) toast.message("Llegaste al stock disponible", { description: `De ${p.nombre} quedan ${r.cantidad} unidades.` });

      if (primeraVez) {
        const falta = compra_minima - subtotalDe(useCarrito.getState().items);
        toast.success("Primer producto en tu pedido", {
          description:
            falta > 0
              ? `La compra mínima es de ${formatARS(compra_minima)}. Te faltan ${formatARS(falta)}.`
              : "Ya superaste la compra mínima.",
          action: { label: "Ver pedido", onClick: () => useCarrito.getState().abrir() },
        });
      }
      return r;
    },
    [compra_minima],
  );
}
