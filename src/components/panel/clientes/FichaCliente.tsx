"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Boton } from "@/components/ui/Boton";
import { guardarCliente } from "@/lib/actions/clientes";
import { AreaTexto, Campo } from "../formulario";

export type DatosCliente = {
  id: string;
  nombre: string;
  negocio: string | null;
  email: string | null;
  documento: string | null;
  ciudad: string | null;
  provincia: string | null;
  notas: string | null;
};

export function FichaCliente({ cliente }: { cliente: DatosCliente }) {
  const [c, setC] = useState(cliente);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, empezar] = useTransition();
  const cambio = JSON.stringify(c) !== JSON.stringify(cliente);
  const set = (k: keyof DatosCliente) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setC({ ...c, [k]: e.target.value });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        empezar(async () => {
          const r = await guardarCliente({
            ...c,
            negocio: c.negocio || null,
            email: c.email || null,
            documento: c.documento || null,
            ciudad: c.ciudad || null,
            provincia: c.provincia || null,
            notas: c.notas || null,
          });
          if (!r.ok) return setError(r.error);
          toast.success("Ficha guardada");
        });
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Nombre" value={c.nombre} onChange={set("nombre")} maxLength={80} />
        <Campo etiqueta="Negocio" value={c.negocio ?? ""} onChange={set("negocio")} maxLength={120} />
        <Campo etiqueta="Email" type="email" value={c.email ?? ""} onChange={set("email")} />
        <Campo etiqueta="DNI / CUIT" value={c.documento ?? ""} onChange={set("documento")} maxLength={30} />
        <Campo etiqueta="Ciudad" value={c.ciudad ?? ""} onChange={set("ciudad")} maxLength={80} />
        <Campo etiqueta="Provincia" value={c.provincia ?? ""} onChange={set("provincia")} maxLength={80} />
      </div>
      <AreaTexto
        etiqueta="Notas internas"
        rows={3}
        value={c.notas ?? ""}
        onChange={set("notas")}
        maxLength={2000}
        placeholder="Ej.: retira los sábados, prefiere transferencia, compra para su kiosco…"
      />
      {error && (
        <p role="alert" className="text-[0.88rem] font-medium text-rojo">
          {error}
        </p>
      )}
      <div className="flex justify-end">
        <Boton type="submit" cargando={pendiente} disabled={!cambio}>
          Guardar ficha
        </Boton>
      </div>
    </form>
  );
}
