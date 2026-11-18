import type { Metadata } from "next";
import { Suspense } from "react";
import { FormIngreso } from "@/components/panel/FormIngreso";
import { PantallaAcceso } from "@/components/panel/PantallaAcceso";

export const metadata: Metadata = { title: "Ingresar al panel", robots: { index: false, follow: false } };

export default function Ingresar() {
  return (
    <PantallaAcceso titulo="Panel del equipo" bajada="Pedidos, mostrador, catálogo y ajustes de Shangai Center.">
      <Suspense fallback={<div className="esqueleto h-64" />}>
        <FormIngreso />
      </Suspense>
    </PantallaAcceso>
  );
}
