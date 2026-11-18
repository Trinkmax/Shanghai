import { ArrowRight, CreditCard } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FormAjustes } from "@/components/panel/ajustes/FormAjustes";
import { TituloPagina } from "@/components/panel/ui";
import { requerirPerfil } from "@/lib/panel/sesion";
import { createClient } from "@/lib/supabase/server";
import type { ConfigTienda } from "@/lib/tienda";
import { cn } from "@/lib/utils";

// Pantalla con sesión: puede bloquear en el servidor al navegar (Cache Components).
export const instant = false;

export const metadata: Metadata = { title: "Ajustes" };

export default async function Ajustes() {
  await requerirPerfil("ajustes");
  const supabase = await createClient();
  const [{ data: c, error }, { data: mp }] = await Promise.all([
    supabase.from("configuracion").select("*").eq("id", true).single(),
    supabase.from("mercadopago").select("conectado, cuenta, modo").eq("id", true).maybeSingle(),
  ]);
  if (error) throw new Error(error.message);
  const config: ConfigTienda = {
    ...c,
    compra_minima: Number(c.compra_minima),
    descuento_transferencia: Number(c.descuento_transferencia),
    horarios: (Array.isArray(c.horarios) ? c.horarios : []) as ConfigTienda["horarios"],
    envios: (Array.isArray(c.envios) ? c.envios : []) as ConfigTienda["envios"],
    transferencia_datos: { titular: "", banco: "", cbu: "", alias: "", cuit: "", ...((c.transferencia_datos ?? {}) as object) } as ConfigTienda["transferencia_datos"],
  };
  const cuenta = mp?.cuenta as { nickname?: string; email?: string } | null;

  return (
    <>
      <TituloPagina titulo="Ajustes" descripcion="Cómo se muestra y cómo vende la tienda. Cada bloque se guarda por separado." />
      <Link
        href="/panel/ajustes/mercado-pago"
        className="group mb-4 flex items-center gap-4 rounded-[var(--radius-pane)] border border-aluminio bg-white p-4 transition-colors hover:border-marca-300 sm:p-5"
      >
        <span className={cn("grid size-12 shrink-0 place-items-center rounded-2xl", mp?.conectado ? "bg-[#e2f4ea] text-verde" : "bg-[#e5f6fd] text-[#009ee3]")}>
          <CreditCard className="size-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-tinta">Mercado Pago</span>
          <span className="block truncate text-[0.88rem] text-tinta-2">
            {mp?.conectado
              ? `Conectado a ${cuenta?.nickname || cuenta?.email || "la cuenta del negocio"}${mp.modo === "prueba" ? " (modo prueba)" : ""}`
              : "Sin conectar: conectá tu cuenta para cobrar online."}
          </span>
        </span>
        <ArrowRight className="size-5 text-tinta-3 transition-transform group-hover:translate-x-0.5" />
      </Link>
      <FormAjustes config={config} />
    </>
  );
}
