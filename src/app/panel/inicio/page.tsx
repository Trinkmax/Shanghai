import type { Metadata } from "next";
import { FormInicial } from "@/components/panel/FormInicial";
import { PantallaAcceso } from "@/components/panel/PantallaAcceso";

export const metadata: Metadata = { title: "Crear la cuenta del dueño", robots: { index: false, follow: false } };

export default function Inicio() {
  return (
    <PantallaAcceso titulo="Crear la cuenta del dueño" bajada="Con esta cuenta vas a sumar al resto del equipo y conectar Mercado Pago.">
      <FormInicial />
    </PantallaAcceso>
  );
}
