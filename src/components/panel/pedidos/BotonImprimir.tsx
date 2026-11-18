"use client";

import { Printer } from "lucide-react";
import { Boton } from "@/components/ui/Boton";

export function BotonImprimir() {
  return (
    <Boton onClick={() => window.print()} className="print:hidden">
      <Printer className="size-4" /> Imprimir
    </Boton>
  );
}
