"use client";

import { AlertCircle, Info } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Boton } from "@/components/ui/Boton";
import { verificarAcceso } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { Campo, CampoClave } from "./formulario";

const MOTIVOS: Record<string, { texto: string; tono: "info" | "error" }> = {
  "sin-acceso": { texto: "Tu cuenta no tiene acceso al panel. Pedile al dueño que te sume al equipo.", tono: "error" },
  salida: { texto: "Cerraste la sesión. ¡Hasta la próxima!", tono: "info" },
  sesion: { texto: "Tu sesión venció. Volvé a ingresar para seguir.", tono: "info" },
};

function traducir(mensaje: string) {
  const m = mensaje.toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid credentials")) return "El email o la contraseña no son correctos.";
  if (m.includes("email not confirmed")) return "Tu email todavía no está confirmado. Pedile al dueño que revise tu cuenta.";
  if (m.includes("rate") || m.includes("too many")) return "Demasiados intentos seguidos. Esperá un minuto y probá de nuevo.";
  if (m.includes("fetch") || m.includes("network")) return "No hay conexión. Revisá internet y probá de nuevo.";
  return "No pudimos iniciar la sesión. Probá de nuevo.";
}

export function FormIngreso() {
  const router = useRouter();
  const params = useSearchParams();
  const motivo = MOTIVOS[params.get("motivo") ?? ""];
  const volver = params.get("volver");
  const destino = volver && volver.startsWith("/panel") && !volver.startsWith("//") ? volver : "/panel";

  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function ingresar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !clave) {
      setError("Completá tu email y tu contraseña.");
      return;
    }
    setEnviando(true);
    const supabase = createClient();
    const { error: eAuth } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: clave });
    if (eAuth) {
      setEnviando(false);
      setError(traducir(eAuth.message));
      return;
    }
    const acceso = await verificarAcceso();
    if (!acceso.ok) {
      await supabase.auth.signOut();
      setEnviando(false);
      setError(acceso.error);
      return;
    }
    router.replace(destino);
    router.refresh();
  }

  return (
    <form onSubmit={ingresar} className="space-y-4" noValidate>
      {motivo && !error && (
        <p
          className={
            motivo.tono === "error"
              ? "flex gap-2.5 rounded-xl bg-[#fbe5e5] p-3 text-[0.88rem] text-rojo"
              : "flex gap-2.5 rounded-xl bg-marca-50 p-3 text-[0.88rem] text-marca-800"
          }
        >
          {motivo.tono === "error" ? <AlertCircle className="mt-0.5 size-4 shrink-0" /> : <Info className="mt-0.5 size-4 shrink-0" />}
          {motivo.texto}
        </p>
      )}
      <Campo
        etiqueta="Email"
        type="email"
        autoComplete="username"
        inputMode="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoFocus
        placeholder="nombre@ejemplo.com"
      />
      <CampoClave etiqueta="Contraseña" autoComplete="current-password" value={clave} onChange={(e) => setClave(e.target.value)} />
      {error && (
        <p role="alert" className="flex gap-2 text-[0.88rem] font-medium text-rojo">
          <AlertCircle className="mt-0.5 size-4 shrink-0" /> {error}
        </p>
      )}
      <Boton type="submit" tam="lg" className="w-full" cargando={enviando}>
        Ingresar al panel
      </Boton>
      <p className="pt-2 text-center text-[0.85rem] text-tinta-3">
        ¿Primera vez?{" "}
        <Link href="/panel/inicio" className="font-semibold text-marca-700 hover:underline">
          Crear la cuenta del dueño
        </Link>
      </p>
    </form>
  );
}
