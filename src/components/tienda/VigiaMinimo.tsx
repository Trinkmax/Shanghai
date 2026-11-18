"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { subtotalDe, useCarrito, useCarritoHidratado } from "@/lib/carrito";
import { useUI } from "@/lib/ui";
import { useTienda } from "./ContextoTienda";

/** Cuando el pedido cruza la compra mínima (durante la visita), el cartel se vuelve a encender y avisa. */
export function VigiaMinimo() {
  const { compra_minima } = useTienda();
  const hidratado = useCarritoHidratado();
  const subtotal = useCarrito((s) => subtotalDe(s.items));
  const anterior = useRef<number | null>(null);
  const encender = useUI((s) => s.encender);
  const router = useRouter();

  useEffect(() => {
    if (!hidratado) return;
    const antes = anterior.current;
    anterior.current = subtotal;
    if (antes === null) return;
    if (antes < compra_minima && subtotal >= compra_minima) {
      encender();
      toast.success("¡Llegaste a la compra mínima!", {
        description: "Ya podés finalizar tu pedido cuando quieras.",
        action: {
          label: "Finalizar",
          onClick: () => {
            useCarrito.getState().cerrar();
            router.push("/checkout");
          },
        },
      });
    }
  }, [subtotal, hidratado, compra_minima, encender, router]);

  return null;
}
