import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function TituloSeccion({
  titulo,
  bajada,
  href,
  accion = "Ver todo",
  className,
  tono = "normal",
  id,
}: {
  titulo: string;
  bajada?: React.ReactNode;
  href?: string;
  accion?: string;
  className?: string;
  tono?: "normal" | "ambar" | "claro";
  id?: string;
}) {
  return (
    <div className={cn("mb-5 flex items-end justify-between gap-4 sm:mb-7", className)}>
      <div className="min-w-0">
        <h2
          id={id}
          className={cn(
            "rotulo text-[clamp(1.6rem,4.2vw,2.6rem)]",
            tono === "ambar" ? "text-ambar-tinta" : tono === "claro" ? "text-white" : "text-marca-700",
          )}
        >
          {titulo}
        </h2>
        {bajada && (
          <p
            className={cn(
              "mt-2.5 max-w-[60ch] text-[0.95rem] sm:text-base",
              tono === "ambar" ? "text-ambar-tinta/85" : tono === "claro" ? "text-marca-100" : "text-tinta-2",
            )}
          >
            {bajada}
          </p>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className={cn(
            "group inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
            tono === "ambar"
              ? "text-ambar-tinta hover:bg-ambar-tinta/8"
              : tono === "claro"
                ? "text-white hover:bg-white/10"
                : "text-marca-700 hover:bg-marca-50",
          )}
        >
          {accion}
          <ArrowRight className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

export function Contenedor({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[1440px] px-3 sm:px-5 lg:px-6", className)}>{children}</div>;
}
