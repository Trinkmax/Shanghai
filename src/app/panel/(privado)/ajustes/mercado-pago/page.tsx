import type { Metadata } from "next";
import { ConexionMP, type EstadoMP } from "@/components/panel/mercadopago/ConexionMP";
import { TituloPagina } from "@/components/panel/ui";
import { puede } from "@/lib/panel/permisos";
import { requerirPerfil } from "@/lib/panel/sesion";
import { createClient } from "@/lib/supabase/server";

// Pantalla con sesión: puede bloquear en el servidor al navegar (Cache Components).
export const instant = false;

export const metadata: Metadata = { title: "Mercado Pago" };

export default async function MercadoPago() {
  const perfil = await requerirPerfil("mercadopago_ver");
  const supabase = await createClient();
  const { data } = await supabase
    .from("mercadopago")
    .select("conectado, public_key, cuenta, modo, webhook_secreto, conectado_en, ultimo_error")
    .eq("id", true)
    .maybeSingle();
  const estado: EstadoMP = {
    conectado: data?.conectado ?? false,
    public_key: data?.public_key ?? null,
    cuenta: (data?.cuenta as EstadoMP["cuenta"]) ?? null,
    modo: data?.modo ?? null,
    webhook_secreto: data?.webhook_secreto ?? false,
    conectado_en: data?.conectado_en ?? null,
    ultimo_error: data?.ultimo_error ?? null,
  };
  return (
    <>
      <TituloPagina
        volver={{ href: "/panel/ajustes", texto: "Ajustes" }}
        titulo="Mercado Pago"
        descripcion="Conectá la cuenta del negocio para que los clientes paguen online. El token queda cifrado y nunca llega al navegador."
      />
      <ConexionMP estado={estado} puedeCambiar={puede(perfil.rol, "mercadopago_cambiar")} />
    </>
  );
}
