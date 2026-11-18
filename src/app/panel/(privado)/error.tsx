"use client";

import { RotateCw } from "lucide-react";
import { Boton } from "@/components/ui/Boton";

export default function ErrorPanel({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <p className="text-lg font-semibold text-tinta">No pudimos cargar esta pantalla</p>
      <p className="mt-2 text-[0.95rem] text-tinta-2">
        {error.message?.includes("conectarnos") ? error.message : "Puede ser la conexión. Probá de nuevo en unos segundos."}
      </p>
      <Boton className="mt-6" onClick={reset}>
        <RotateCw className="size-4" /> Reintentar
      </Boton>
    </div>
  );
}
