"use client";

import { Check } from "lucide-react";
import { TRAZO_ISOTIPO } from "@/components/marca/Isotipo";
import { formatARS } from "@/lib/format";
import { cn } from "@/lib/utils";

const CARA_SUPERIOR = "M50 7.5 87 28.5 50 49.5 13 28.5Z";

/**
 * La "S" del logo se dibuja a lo largo de su propio trazo a medida que el pedido
 * se acerca a la compra mínima. Completa = la caja se enciende.
 */
export function CajaProgreso({
  progreso,
  className,
  sobreOscuro = false,
  grosor = 10,
}: {
  progreso: number;
  className?: string;
  sobreOscuro?: boolean;
  grosor?: number;
}) {
  const p = Math.max(0, Math.min(1, progreso));
  const completa = p >= 1;
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("shrink-0 overflow-visible", className)}
      aria-hidden="true"
      style={{
        filter: completa
          ? sobreOscuro
            ? "drop-shadow(0 0 6px rgb(202 205 237 / 0.85))"
            : "drop-shadow(0 0 7px rgb(92 99 170 / 0.55))"
          : undefined,
        transition: "filter 400ms ease",
      }}
    >
      <path
        d={CARA_SUPERIOR}
        fill={sobreOscuro ? "rgb(202 205 237 / 0.28)" : "rgb(92 99 170 / 0.14)"}
        style={{ opacity: completa ? 1 : 0, transition: "opacity 500ms ease 250ms" }}
      />
      <path
        d={TRAZO_ISOTIPO}
        pathLength={100}
        fill="none"
        stroke={sobreOscuro ? "rgb(255 255 255 / 0.22)" : "var(--color-aluminio)"}
        strokeWidth={grosor}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d={TRAZO_ISOTIPO}
        pathLength={100}
        fill="none"
        stroke={sobreOscuro ? (completa ? "#ffffff" : "var(--color-marca-200)") : "var(--color-marca-600)"}
        strokeWidth={grosor}
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeDasharray="100 100"
        strokeDashoffset={100 - p * 100}
        style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.23, 1, 0.32, 1), stroke 300ms ease" }}
      />
    </svg>
  );
}

/** Bloque completo: caja + texto de cuánto falta. */
export function MedidorMinimo({
  subtotal,
  minimo,
  className,
  sobreOscuro = false,
  compacto = false,
}: {
  subtotal: number;
  minimo: number;
  className?: string;
  sobreOscuro?: boolean;
  compacto?: boolean;
}) {
  const progreso = minimo > 0 ? subtotal / minimo : 1;
  const falta = Math.max(0, minimo - subtotal);
  const completa = falta <= 0;

  return (
    <div className={cn("flex items-center gap-3.5", className)} aria-live="polite">
      <CajaProgreso progreso={progreso} sobreOscuro={sobreOscuro} className={compacto ? "size-10" : "size-14"} />
      <div className="min-w-0 flex-1">
        {completa ? (
          <p className={cn("flex items-center gap-1.5 font-semibold", sobreOscuro ? "text-white" : "text-tinta")}>
            <Check className={cn("size-4", sobreOscuro ? "text-marca-200" : "text-verde")} strokeWidth={3} />
            Compra mínima alcanzada
          </p>
        ) : (
          <p className={cn("font-semibold", sobreOscuro ? "text-white" : "text-tinta")}>
            Te faltan <span className="tabular">{formatARS(falta)}</span>
          </p>
        )}
        {!compacto && (
          <div className="mt-1.5">
            <div
              className={cn("h-1.5 overflow-hidden rounded-full", sobreOscuro ? "bg-white/15" : "bg-vidrio-2")}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={minimo}
              aria-valuenow={Math.min(subtotal, minimo)}
              aria-label="Avance hacia la compra mínima"
            >
              <div
                className={cn("h-full origin-left rounded-full", sobreOscuro ? "bg-marca-200" : "bg-marca-500")}
                style={{
                  transform: `scaleX(${Math.min(1, progreso)})`,
                  transition: "transform 700ms cubic-bezier(0.23, 1, 0.32, 1)",
                }}
              />
            </div>
            <p className={cn("mt-1.5 text-[0.8rem]", sobreOscuro ? "text-marca-200" : "text-tinta-3")}>
              Compra mínima <span className="tabular">{formatARS(minimo)}</span>
              {!completa && subtotal > 0 && (
                <>
                  {" · "}llevás <span className="tabular">{formatARS(subtotal)}</span>
                </>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
