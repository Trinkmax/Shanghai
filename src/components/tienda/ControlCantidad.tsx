"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Selector de cantidad: − [n] +. Tocar el número permite tipear (teclado numérico
 * en el celular): un mayorista pide 48 unidades, no aprieta "+" 48 veces.
 */
export function ControlCantidad({
  valor,
  minimo = 1,
  maximo,
  onCambiar,
  onQuitar,
  tam = "md",
  className,
  etiqueta = "Cantidad",
}: {
  valor: number;
  minimo?: number;
  maximo?: number | null;
  onCambiar: (n: number) => void;
  onQuitar?: () => void;
  tam?: "sm" | "md" | "lg";
  className?: string;
  etiqueta?: string;
}) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(String(valor));
  const input = useRef<HTMLInputElement>(null);
  const reducir = useReducedMotion();
  const tope = maximo ?? 100000;
  const enMinimo = valor <= minimo;

  useEffect(() => {
    if (editando) input.current?.select();
  }, [editando]);

  function confirmar() {
    const n = parseInt(texto.replace(/\D/g, ""), 10);
    setEditando(false);
    if (!Number.isFinite(n)) return;
    if (n <= 0 && onQuitar) return onQuitar();
    onCambiar(Math.min(tope, Math.max(minimo, n)));
  }

  const alto = { sm: "h-9", md: "h-11", lg: "h-14" }[tam];
  const boton = { sm: "w-9 [&_svg]:size-4", md: "w-11 [&_svg]:size-[18px]", lg: "w-14 [&_svg]:size-5" }[tam];
  const numero = { sm: "min-w-9 text-sm", md: "min-w-11 text-base", lg: "min-w-16 text-lg" }[tam];

  return (
    <div
      role="group"
      aria-label={etiqueta}
      className={cn(
        "inline-flex items-stretch overflow-hidden rounded-xl border border-aluminio-2 bg-white text-tinta",
        alto,
        className,
      )}
    >
      <button
        type="button"
        className={cn(
          "presionable grid place-items-center text-tinta-2 transition-colors hover:bg-vidrio hover:text-tinta disabled:opacity-40",
          boton,
        )}
        onClick={() => (enMinimo ? onQuitar?.() : onCambiar(valor - 1))}
        disabled={enMinimo && !onQuitar}
        aria-label={enMinimo && onQuitar ? "Quitar del pedido" : "Restar una unidad"}
      >
        {enMinimo && onQuitar ? <Trash2 /> : <Minus />}
      </button>

      {editando ? (
        <input
          ref={input}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={confirmar}
          onKeyDown={(e) => {
            if (e.key === "Enter") confirmar();
            if (e.key === "Escape") setEditando(false);
          }}
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label={`${etiqueta}: escribí las unidades`}
          className={cn("tabular w-16 bg-marca-50 text-center font-bold outline-none", numero)}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setTexto(String(valor));
            setEditando(true);
          }}
          className={cn("tabular relative grid place-items-center overflow-hidden px-1 font-bold hover:bg-vidrio", numero)}
          aria-label={`${valor} unidades. Tocá para escribir otra cantidad`}
        >
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={valor}
              initial={reducir ? { opacity: 0 } : { y: 10, opacity: 0, filter: "blur(2px)" }}
              animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
              exit={reducir ? { opacity: 0 } : { y: -10, opacity: 0, filter: "blur(2px)" }}
              transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
            >
              {valor}
            </motion.span>
          </AnimatePresence>
        </button>
      )}

      <button
        type="button"
        className={cn(
          "presionable grid place-items-center text-tinta-2 transition-colors hover:bg-vidrio hover:text-tinta disabled:opacity-40",
          boton,
        )}
        onClick={() => onCambiar(valor + 1)}
        disabled={valor >= tope}
        aria-label="Sumar una unidad"
      >
        <Plus />
      </button>
    </div>
  );
}
