import { partesPrecio } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Precio compuesto: "$" chico arriba + entero grande tabular. */
export function Precio({
  monto,
  className,
  tam = "md",
  tachado,
}: {
  monto: number;
  className?: string;
  tam?: "sm" | "md" | "lg" | "xl";
  tachado?: number | null;
}) {
  const { entero } = partesPrecio(monto);
  const t = {
    sm: "text-[1.02rem]",
    md: "text-[1.25rem]",
    lg: "text-[1.75rem]",
    xl: "text-[2.4rem] sm:text-[2.75rem]",
  }[tam];
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)}>
      <span className={cn("tabular inline-flex items-start font-bold leading-none tracking-[-0.02em] text-tinta", t)}>
        <span className="mr-[0.08em] mt-[0.12em] text-[0.58em] font-semibold">$</span>
        {entero}
      </span>
      {tachado != null && tachado > monto && (
        <span className="tabular text-[0.82rem] font-medium text-tinta-3 line-through decoration-tinta-3/70">
          $ {partesPrecio(tachado).entero}
        </span>
      )}
    </span>
  );
}
