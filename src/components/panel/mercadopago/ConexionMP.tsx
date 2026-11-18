"use client";

import { AlertTriangle, CheckCircle2, ExternalLink, Plug, RefreshCw, ShieldCheck, Unplug } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Boton } from "@/components/ui/Boton";
import { conectarMercadoPago, desconectarMercadoPago, probarMercadoPago } from "@/lib/actions/mercadopago";
import { formatFechaHora } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useConfirmar } from "../Dialogo";
import { Campo, CampoClave, Copiable } from "../formulario";
import { Tarjeta } from "../ui";

export type EstadoMP = {
  conectado: boolean;
  public_key: string | null;
  cuenta: { id?: number; nickname?: string; email?: string; site_id?: string; nombre?: string } | null;
  modo: "produccion" | "prueba" | null;
  webhook_secreto: boolean;
  conectado_en: string | null;
  ultimo_error: string | null;
};

const URL_WEBHOOK = "https://xxpyblnhedtjtvbhljcy.supabase.co/functions/v1/shangai-mp-webhook";

function Pasos() {
  const pasos = [
    {
      t: "Entrá a Mercado Pago Developers",
      d: (
        <>
          Con la cuenta del negocio, abrí{" "}
          <a href="https://www.mercadopago.com.ar/developers/panel/app" target="_blank" rel="noreferrer" className="font-semibold text-marca-700 underline">
            Tus integraciones
          </a>{" "}
          y creá una aplicación (tipo “Pagos online”, Checkout Pro). Si ya tenés una, usala.
        </>
      ),
    },
    { t: "Copiá las credenciales de producción", d: "En la aplicación: Producción › Credenciales de producción. Necesitás la Public Key y el Access Token (empiezan con APP_USR-)." },
    { t: "Pegalas acá y conectá", d: "Validamos el token con Mercado Pago y lo guardamos cifrado. Desde ese momento la tienda ofrece pagar con Mercado Pago." },
  ];
  return (
    <ol className="space-y-4">
      {pasos.map((p, i) => (
        <li key={p.t} className="flex gap-3.5">
          <span className="cartel grid size-8 shrink-0 place-items-center rounded-lg text-sm font-extrabold">
            <span className="cartel-luz" />
            {i + 1}
          </span>
          <div>
            <p className="font-semibold text-tinta">{p.t}</p>
            <p className="mt-0.5 text-[0.9rem] leading-relaxed text-tinta-2">{p.d}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function ConexionMP({ estado, puedeCambiar }: { estado: EstadoMP; puedeCambiar: boolean }) {
  const confirmar = useConfirmar();
  const [pendiente, empezar] = useTransition();
  const [reemplazar, setReemplazar] = useState(false);
  const [datos, setDatos] = useState({ access_token: "", public_key: "", webhook_secret: "" });
  const [error, setError] = useState<string | null>(null);
  const mostrarForm = puedeCambiar && (!estado.conectado || reemplazar);

  function conectar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    empezar(async () => {
      const r = await conectarMercadoPago({
        access_token: datos.access_token,
        public_key: datos.public_key,
        webhook_secret: datos.webhook_secret || undefined,
      });
      if (!r.ok) return setError(r.error);
      setDatos({ access_token: "", public_key: "", webhook_secret: "" });
      setReemplazar(false);
      toast.success("Mercado Pago conectado", {
        description: `Cuenta ${r.data.cuenta.nickname || r.data.cuenta.email}${r.data.modo === "prueba" ? " · modo prueba" : ""}. La tienda ya cobra online.`,
      });
    });
  }

  function probar() {
    empezar(async () => {
      const r = await probarMercadoPago();
      if (r.ok) toast.success("La conexión funciona", { description: `Mercado Pago responde para ${r.data.cuenta.nickname || r.data.cuenta.email}.` });
      else toast.error(r.error);
    });
  }

  function desconectar() {
    empezar(async () => {
      const ok = await confirmar({
        titulo: "¿Desconectar Mercado Pago?",
        descripcion: "La tienda deja de ofrecer pagar con Mercado Pago (los pedidos ya pagados no cambian). Las credenciales se borran del sistema.",
        confirmar: "Desconectar",
        peligro: true,
      });
      if (!ok) return;
      const r = await desconectarMercadoPago();
      if (r.ok) toast.success("Mercado Pago desconectado");
      else toast.error(r.error);
    });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        {estado.conectado ? (
          <Tarjeta>
            <div className="flex flex-wrap items-start gap-4">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#e2f4ea] text-verde">
                <CheckCircle2 className="size-7" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-[1.1rem] font-bold text-tinta">
                  Conectado
                  <span className={cn("vinilo", estado.modo === "prueba" ? "vinilo-ambar" : "bg-verde text-white")}>
                    {estado.modo === "prueba" ? "Modo prueba" : "Producción"}
                  </span>
                </p>
                <p className="mt-1 truncate text-[0.95rem] text-tinta-2">
                  {estado.cuenta?.nombre || estado.cuenta?.nickname}
                  {estado.cuenta?.email && ` · ${estado.cuenta.email}`}
                </p>
                {estado.conectado_en && <p className="mt-0.5 text-[0.82rem] text-tinta-3">Desde el {formatFechaHora(estado.conectado_en)}</p>}
              </div>
            </div>
            {estado.modo === "prueba" && (
              <p className="mt-4 flex gap-2 rounded-xl bg-[#fff7dc] px-3.5 py-2.5 text-[0.88rem] text-ambar-tinta">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                Con credenciales de prueba los pagos no son reales. Para cobrar de verdad, conectá las credenciales de producción.
              </p>
            )}
            {estado.ultimo_error && (
              <p className="mt-4 flex gap-2 rounded-xl bg-[#fbe5e5] px-3.5 py-2.5 text-[0.88rem] text-rojo">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                Último control: {estado.ultimo_error}
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <Boton variante="claro" onClick={probar} cargando={pendiente && !reemplazar}>
                <RefreshCw className="size-4" /> Probar conexión
              </Boton>
              {puedeCambiar && (
                <>
                  <Boton variante="claro" onClick={() => setReemplazar((v) => !v)} disabled={pendiente}>
                    <Plug className="size-4" /> {reemplazar ? "Cancelar" : "Cambiar credenciales"}
                  </Boton>
                  <Boton variante="fantasma" onClick={desconectar} disabled={pendiente} className="text-rojo hover:bg-[#fbe5e5] hover:text-rojo">
                    <Unplug className="size-4" /> Desconectar
                  </Boton>
                </>
              )}
            </div>
          </Tarjeta>
        ) : (
          <Tarjeta titulo="Conectá tu cuenta en 3 pasos">
            <Pasos />
          </Tarjeta>
        )}

        {mostrarForm && (
          <Tarjeta titulo={estado.conectado ? "Nuevas credenciales" : "Credenciales"}>
            <form onSubmit={conectar} className="space-y-4" autoComplete="off">
              <Campo
                etiqueta="Public Key"
                value={datos.public_key}
                onChange={(e) => setDatos({ ...datos, public_key: e.target.value.trim() })}
                placeholder="APP_USR-…"
                spellCheck={false}
              />
              <CampoClave
                etiqueta="Access Token"
                value={datos.access_token}
                onChange={(e) => setDatos({ ...datos, access_token: e.target.value.trim() })}
                placeholder="APP_USR-…"
                spellCheck={false}
                ayuda="Nunca lo compartas: con él se puede cobrar en nombre de tu cuenta. Acá queda guardado cifrado."
              />
              <CampoClave
                etiqueta="Clave secreta de webhooks (opcional)"
                value={datos.webhook_secret}
                onChange={(e) => setDatos({ ...datos, webhook_secret: e.target.value.trim() })}
                spellCheck={false}
                ayuda="Si configurás webhooks en Mercado Pago, pegá la clave secreta para verificar cada aviso."
              />
              {error && (
                <p role="alert" className="flex gap-2 rounded-xl bg-[#fbe5e5] px-3.5 py-2.5 text-[0.88rem] font-medium text-rojo">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {error}
                </p>
              )}
              <Boton type="submit" tam="lg" cargando={pendiente} disabled={!datos.access_token || !datos.public_key} className="w-full sm:w-auto">
                <ShieldCheck className="size-5" /> Validar y conectar
              </Boton>
            </form>
          </Tarjeta>
        )}
        {!puedeCambiar && !estado.conectado && (
          <p className="text-[0.9rem] text-tinta-2">Pedile al dueño que conecte la cuenta: solo ese rol puede cargar las credenciales.</p>
        )}
      </div>

      <div className="space-y-4">
        <Tarjeta titulo="Cómo funciona el cobro">
          <ul className="space-y-3 text-[0.9rem] leading-relaxed text-tinta-2">
            <li>El cliente arma el pedido, elige Mercado Pago y paga en la página segura de Mercado Pago (tarjeta, débito, dinero en cuenta o efectivo).</li>
            <li>Cuando el pago se acredita, Mercado Pago nos avisa y el pedido pasa solo a “Pagado · Confirmado”. Lo ves en Pedidos al instante.</li>
            <li>El dinero entra directo en tu cuenta de Mercado Pago, con las comisiones y plazos de tu cuenta.</li>
          </ul>
        </Tarjeta>
        <Tarjeta titulo="Avisos de pago (opcional)" descripcion="Cada pago ya informa esta dirección automáticamente; configurarla en Mercado Pago es un respaldo.">
          <Copiable texto={URL_WEBHOOK} etiqueta="URL de notificaciones" />
          <p className="mt-3 text-[0.85rem] text-tinta-3">
            En tu aplicación de Mercado Pago: Webhooks › Configurar notificaciones › modo producción › evento “Pagos”.{" "}
            {estado.webhook_secreto ? "La clave secreta ya está cargada." : "Si lo hacés, cargá la clave secreta en el formulario."}
          </p>
          <a
            href="https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-marca-700 hover:underline"
          >
            Guía de webhooks <ExternalLink className="size-3.5" />
          </a>
        </Tarjeta>
      </div>
    </div>
  );
}
