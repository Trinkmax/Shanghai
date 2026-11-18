import { Slot } from "radix-ui";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variante = "cartel" | "claro" | "fantasma" | "ambar" | "peligro" | "wa";
type Tam = "sm" | "md" | "lg";

const VARIANTES: Record<Variante, string> = {
  // Acrílico iluminado: la acción principal
  cartel:
    "cartel text-white hover:brightness-[1.08] disabled:brightness-100 disabled:saturate-50 disabled:opacity-60",
  claro:
    "bg-white text-tinta border border-aluminio-2 shadow-[0_1px_0_rgb(22_20_44/0.04)] hover:border-tinta-3 hover:bg-vidrio disabled:opacity-50",
  fantasma: "text-tinta-2 hover:bg-vidrio-2 hover:text-tinta disabled:opacity-50",
  ambar:
    "bg-ambar text-ambar-tinta shadow-[0_1px_0_rgb(255_255_255/0.5)_inset,0_6px_16px_-8px_rgb(242_174_0/0.9)] hover:bg-[#ffcb3d] disabled:opacity-60",
  peligro: "bg-rojo text-white hover:brightness-110 disabled:opacity-60",
  wa: "bg-wa text-[#073b1f] hover:brightness-105 shadow-[0_6px_16px_-8px_rgb(37_211_102/0.9)]",
};

const TAMANOS: Record<Tam, string> = {
  sm: "h-9 px-3.5 text-sm gap-1.5 rounded-xl",
  md: "h-11 px-5 text-[0.95rem] gap-2 rounded-xl",
  lg: "h-14 px-6 text-base gap-2.5 rounded-2xl",
};

export type BotonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante;
  tam?: Tam;
  cargando?: boolean;
  asChild?: boolean;
};

export const Boton = forwardRef<HTMLButtonElement, BotonProps>(function Boton(
  { variante = "cartel", tam = "md", cargando = false, asChild, className, children, disabled, ...props },
  ref,
) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      ref={ref}
      className={cn(
        "presionable relative inline-flex select-none items-center justify-center whitespace-nowrap font-semibold transition-[filter,background-color,border-color,color,opacity] duration-150 disabled:cursor-not-allowed",
        VARIANTES[variante],
        TAMANOS[tam],
        className,
      )}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          <span className={cn("inline-flex items-center gap-[inherit] transition-[opacity,filter] duration-200", cargando && "opacity-0 blur-[2px]")}>
            {children}
          </span>
          {cargando && (
            <span className="absolute inset-0 grid place-items-center" aria-hidden="true">
              <span className="size-5 animate-spin rounded-full border-2 border-current border-r-transparent [animation-duration:600ms]" />
            </span>
          )}
        </>
      )}
    </Comp>
  );
});
