import type { Metadata } from "next";
import { requerirPerfil } from "@/lib/panel/sesion";

export const instant = false;
export const metadata: Metadata = { title: "Remito", robots: { index: false, follow: false } };

export default async function LayoutImpresion({ children }: { children: React.ReactNode }) {
  await requerirPerfil("ver_pedidos");
  return <div className="min-h-dvh bg-vidrio print:bg-white">{children}</div>;
}
