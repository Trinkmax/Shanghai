import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Logotipo } from "@/components/marca/Isotipo";

/** Marco de las pantallas de acceso: el cartel del local arriba y el formulario en un paño. */
export function PantallaAcceso({ titulo, bajada, children }: { titulo: string; bajada?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center bg-vidrio px-3 pb-10 pt-3 sm:justify-center sm:pt-10">
      <div className="w-full max-w-[440px]">
        <div className="cartel flex h-16 items-center justify-center rounded-2xl" data-encender="true">
          <span className="cartel-luz" />
          <Logotipo conBajada className="[&_svg]:size-8" />
        </div>
        <div className="mt-3 rounded-[1.5rem] border border-aluminio bg-white p-6 shadow-[var(--shadow-pane)] sm:p-8">
          <h1 className="text-[1.45rem] font-bold leading-tight text-tinta">{titulo}</h1>
          {bajada && <p className="mt-1.5 text-[0.95rem] text-tinta-2">{bajada}</p>}
          <div className="mt-6">{children}</div>
        </div>
        <Link
          href="/"
          className="mx-auto mt-5 flex w-fit items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-tinta-3 hover:text-marca-700"
        >
          <ArrowLeft className="size-4" /> Volver a la tienda
        </Link>
      </div>
    </div>
  );
}
