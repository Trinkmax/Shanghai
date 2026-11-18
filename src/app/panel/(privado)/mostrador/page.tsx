import type { Metadata } from "next";
import { Mostrador } from "@/components/panel/mostrador/Mostrador";
import { TituloPagina } from "@/components/panel/ui";
import { requerirPerfil } from "@/lib/panel/sesion";

// Pantalla con sesión: puede bloquear en el servidor al navegar (Cache Components).
export const instant = false;

export const metadata: Metadata = { title: "Mostrador" };

export default async function PaginaMostrador() {
  await requerirPerfil("mostrador");
  return (
    <>
      <TituloPagina
        titulo="Venta en el local"
        descripcion="Cargá los productos por código o nombre, elegí cómo paga y registrá la venta. El stock y el ranking se actualizan solos."
      />
      <Mostrador />
    </>
  );
}
