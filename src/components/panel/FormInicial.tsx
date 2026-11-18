"use client";

import { AlertCircle, KeyRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Boton } from "@/components/ui/Boton";
import { inicializarDueno } from "@/lib/actions/auth";
import { verificarAcceso } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { Campo, CampoClave } from "./formulario";

export function FormInicial() {
  const router = useRouter();
  const [datos, setDatos] = useState({ codigo: "", nombre: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const set = (k: keyof typeof datos) => (e: React.ChangeEvent<HTMLInputElement>) => setDatos((d) => ({ ...d, [k]: e.target.value }));

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    const r = await inicializarDueno(datos);
    if (!r.ok) {
      setEnviando(false);
      setError(r.error);
      return;
    }
    const supabase = createClient();
    const { error: eAuth } = await supabase.auth.signInWithPassword({ email: datos.email.trim().toLowerCase(), password: datos.password });
    if (eAuth) {
      setEnviando(false);
      toast.success("Cuenta creada", {
        description: r.data.vinculado
          ? "Ese email ya tenía cuenta en el sistema: ingresá con tu contraseña de siempre."
          : "Ingresá con tu email y contraseña.",
      });
      router.replace("/panel/ingresar");
      return;
    }
    await verificarAcceso();
    toast.success("¡Listo! Ya sos el dueño del panel.");
    router.replace("/panel");
    router.refresh();
  }

  return (
    <form onSubmit={crear} className="space-y-4" noValidate>
      <div className="flex gap-3 rounded-xl bg-marca-50 p-3.5 text-[0.88rem] text-marca-900">
        <KeyRound className="mt-0.5 size-4 shrink-0 text-marca-600" />
        <p>Este paso se hace una sola vez. Usá el código inicial que te pasó quien instaló el sistema.</p>
      </div>
      <Campo
        etiqueta="Código inicial"
        value={datos.codigo}
        onChange={(e) => setDatos((d) => ({ ...d, codigo: e.target.value.toUpperCase() }))}
        placeholder="SHANG-XXXX-XXXX"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        autoFocus
        className="[&_input]:tracking-[0.06em]"
      />
      <Campo etiqueta="Tu nombre" value={datos.nombre} onChange={set("nombre")} autoComplete="name" placeholder="Nombre y apellido" />
      <Campo
        etiqueta="Email"
        type="email"
        inputMode="email"
        autoComplete="username"
        value={datos.email}
        onChange={set("email")}
        placeholder="nombre@ejemplo.com"
      />
      <CampoClave
        etiqueta="Contraseña"
        autoComplete="new-password"
        value={datos.password}
        onChange={set("password")}
        ayuda="Mínimo 8 caracteres. Mezclá letras y números."
      />
      {error && (
        <p role="alert" className="flex gap-2 text-[0.88rem] font-medium text-rojo">
          <AlertCircle className="mt-0.5 size-4 shrink-0" /> {error}
        </p>
      )}
      <Boton type="submit" tam="lg" className="w-full" cargando={enviando}>
        Crear cuenta de dueño
      </Boton>
      <p className="pt-2 text-center text-[0.85rem] text-tinta-3">
        ¿Ya tenés cuenta?{" "}
        <Link href="/panel/ingresar" className="font-semibold text-marca-700 hover:underline">
          Ingresar
        </Link>
      </p>
    </form>
  );
}
