"use client";

import { RotateCcw } from "lucide-react";
import { Isotipo } from "@/components/marca/Isotipo";

export default function ErrorTienda({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-[1440px] px-3 pt-8 sm:px-5">
      <div className="vidriera flex flex-col items-center px-6 py-20 text-center">
        <Isotipo className="size-20 text-aluminio" grosor={6} />
        <h1 className="mt-6 text-2xl font-bold text-tinta">Se nos cortó la luz un momento</h1>
        <p className="mt-2 max-w-[44ch] text-tinta-2">No pudimos cargar esta parte de la tienda. Probá de nuevo; si sigue, escribinos por WhatsApp.</p>
        <button type="button" onClick={reset} className="cartel presionable mt-8 inline-flex h-12 items-center gap-2 rounded-xl px-5 font-semibold">
          <RotateCcw className="size-4" /> Reintentar
        </button>
      </div>
    </div>
  );
}
