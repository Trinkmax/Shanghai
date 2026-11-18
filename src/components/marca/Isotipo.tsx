import { cn } from "@/lib/utils";

/** Trazo único de la caja hexagonal con la "S" (recreado del cartel original). */
export const TRAZO_ISOTIPO = "M70 18.5 50 7.5 13 28.5 50 49.5 87 28.5 87 71.5 50 92.5 13 71.5 13 43";

export function Isotipo({ className, grosor = 10 }: { className?: string; grosor?: number }) {
  return (
    <svg viewBox="0 0 100 100" className={cn("shrink-0", className)} aria-hidden="true" focusable="false">
      <path d={TRAZO_ISOTIPO} fill="none" stroke="currentColor" strokeWidth={grosor} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** Logotipo completo. tono "claro" = sobre el cartel índigo. */
export function Logotipo({
  className,
  tono = "claro",
  conBajada = false,
}: {
  className?: string;
  tono?: "claro" | "oscuro";
  conBajada?: boolean;
}) {
  const claro = tono === "claro";
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Isotipo className={cn("size-8", claro ? "text-marca-200" : "text-marca-500")} />
      <span className="flex flex-col">
        <span className="rotulo text-[1.05rem] tracking-[0.02em]">
          <span className={claro ? "text-white" : "text-marca-700"}>Shangai</span>{" "}
          <span className={claro ? "text-marca-200" : "text-marca-500"}>Center</span>
        </span>
        {conBajada && (
          <span className={cn("rotulo-medio mt-1 text-[0.6rem]", claro ? "text-marca-200/90" : "text-tinta-3")}>
            Importador mayorista
          </span>
        )}
      </span>
    </span>
  );
}

/** Logo grande (vidriera): caja + "SHANGAI / CENTER" en dos líneas + bajada. El tamaño lo da el font-size del contenedor. */
export function LogoGrande({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-[0.28em]", className)} aria-hidden="true">
      <Isotipo className="h-[2.05em] w-[2.05em] text-marca-500" grosor={9.5} />
      <span className="flex flex-col">
        <span className="rotulo leading-[0.92] text-marca-700">Shangai</span>
        <span className="rotulo leading-[0.92] text-marca-500">Center</span>
        <span className="rotulo-medio mt-[0.45em] text-[0.2em] tracking-[0.3em] text-tinta-2">Importador mayorista</span>
      </span>
    </span>
  );
}
