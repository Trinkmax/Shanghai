"use client";

import { Plus, Save, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Boton } from "@/components/ui/Boton";
import { guardarAjustes } from "@/lib/actions/ajustes";
import { formatARS } from "@/lib/format";
import { DIAS, type ConfigTienda, type Horario, type OpcionEnvio } from "@/lib/tienda";
import { cn } from "@/lib/utils";
import { Campo, CampoMonto, Interruptor } from "../formulario";
import { Tarjeta } from "../ui";

type Seccion = Parameters<typeof guardarAjustes>[0];

function useGuardar(seccion: Seccion, mensaje: string) {
  const [pendiente, empezar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const guardar = (datos: unknown, alTerminar?: () => void) =>
    empezar(async () => {
      setError(null);
      const r = await guardarAjustes(seccion, datos);
      if (!r.ok) {
        setError(r.error);
        toast.error(r.error);
        return;
      }
      toast.success(mensaje, { description: "La tienda ya muestra el cambio." });
      alTerminar?.();
    });
  return { pendiente, error, guardar };
}

function Pie({ pendiente, error, sucio, onGuardar }: { pendiente: boolean; error: string | null; sucio: boolean; onGuardar: () => void }) {
  return (
    <div className="mt-5 flex flex-col-reverse items-stretch gap-3 border-t border-aluminio pt-4 sm:flex-row sm:items-center sm:justify-end">
      {error && <p className="text-[0.88rem] font-medium text-rojo sm:mr-auto">{error}</p>}
      {!error && sucio && <p className="text-[0.85rem] text-tinta-3 sm:mr-auto">Cambios sin guardar</p>}
      <Boton onClick={onGuardar} cargando={pendiente} disabled={!sucio}>
        <Save className="size-4" /> Guardar
      </Boton>
    </div>
  );
}

function Tienda({ c }: { c: ConfigTienda }) {
  const inicial = {
    nombre_tienda: c.nombre_tienda,
    descripcion: c.descripcion,
    whatsapp: c.whatsapp,
    telefono: c.telefono ?? "",
    email: c.email ?? "",
    direccion: c.direccion,
    ciudad: c.ciudad,
    mapa_url: c.mapa_url ?? "",
    instagram: c.instagram ?? "",
    facebook: c.facebook ?? "",
    anuncio: c.anuncio ?? "",
  };
  const [d, setD] = useState(inicial);
  const [base, setBase] = useState(inicial);
  const { pendiente, error, guardar } = useGuardar("tienda", "Datos de la tienda guardados");
  const set = (k: keyof typeof d) => (e: React.ChangeEvent<HTMLInputElement>) => setD({ ...d, [k]: e.target.value });
  const sucio = JSON.stringify(d) !== JSON.stringify(base);
  return (
    <Tarjeta titulo="Datos de la tienda" descripcion="Aparecen en la cabecera, el pie y los mensajes de WhatsApp.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Nombre" value={d.nombre_tienda} onChange={set("nombre_tienda")} maxLength={80} />
        <Campo etiqueta="Bajada" value={d.descripcion} onChange={set("descripcion")} maxLength={120} />
        <Campo etiqueta="WhatsApp" value={d.whatsapp} onChange={set("whatsapp")} inputMode="tel" ayuda="Con código de país y de área: 5493516061756" />
        <Campo etiqueta="Teléfono (opcional)" value={d.telefono} onChange={set("telefono")} inputMode="tel" />
        <Campo etiqueta="Dirección" value={d.direccion} onChange={set("direccion")} maxLength={120} />
        <Campo etiqueta="Ciudad" value={d.ciudad} onChange={set("ciudad")} maxLength={80} />
        <Campo etiqueta="Email (opcional)" type="email" value={d.email} onChange={set("email")} />
        <Campo etiqueta="Instagram" value={d.instagram} onChange={set("instagram")} ayuda="Solo el usuario, sin @" />
        <Campo etiqueta="Facebook (opcional)" value={d.facebook} onChange={set("facebook")} />
        <Campo etiqueta="Enlace de Google Maps (opcional)" value={d.mapa_url} onChange={set("mapa_url")} placeholder="https://maps.app.goo.gl/…" />
        <Campo
          className="sm:col-span-2"
          etiqueta="Aviso en la cabecera (opcional)"
          value={d.anuncio}
          onChange={set("anuncio")}
          maxLength={160}
          placeholder="Ej.: Este sábado 23 abrimos hasta las 14 h"
        />
      </div>
      <Pie pendiente={pendiente} error={error} sucio={sucio} onGuardar={() => guardar({ ...d, email: d.email || null, telefono: d.telefono || null, mapa_url: d.mapa_url || null, instagram: d.instagram || null, facebook: d.facebook || null, anuncio: d.anuncio || null }, () => setBase(d))} />
    </Tarjeta>
  );
}

function Horarios({ c }: { c: ConfigTienda }) {
  const [h, setH] = useState<Horario[]>(c.horarios);
  const [base, setBase] = useState(c.horarios);
  const { pendiente, error, guardar } = useGuardar("horarios", "Horarios guardados");
  const sucio = JSON.stringify(h) !== JSON.stringify(base);
  const orden = [1, 2, 3, 4, 5, 6, 0];

  function copiarLunesASemana() {
    const lunes = h.filter((x) => x.dia === 1);
    if (!lunes.length) return toast.message("Primero cargá el horario del lunes.");
    setH([...h.filter((x) => x.dia === 0 || x.dia === 6), ...[1, 2, 3, 4, 5].flatMap((d) => lunes.map((l) => ({ ...l, dia: d })))]);
  }

  return (
    <Tarjeta
      titulo="Horarios del local"
      descripcion="Con horarios cargados, el cartel muestra “Abierto” o “Cerrado” en vivo. Sin horarios, no se muestra nada."
      accion={
        <button type="button" onClick={copiarLunesASemana} className="text-sm font-semibold text-marca-700 hover:underline">
          Copiar lunes a viernes
        </button>
      }
    >
      <ul className="divide-y divide-aluminio">
        {orden.map((dia) => {
          const franjas = h.map((x, i) => ({ ...x, i })).filter((x) => x.dia === dia);
          return (
            <li key={dia} className="flex flex-wrap items-center gap-3 py-2.5">
              <span className="w-24 text-[0.92rem] font-medium capitalize text-tinta">{DIAS[dia]}</span>
              <div className="flex flex-1 flex-wrap items-center gap-2">
                {franjas.length === 0 && <span className="text-[0.88rem] text-tinta-3">Cerrado</span>}
                {franjas.map((f) => (
                  <span key={f.i} className="inline-flex items-center gap-1.5 rounded-xl border border-aluminio bg-vidrio/60 p-1">
                    <input
                      type="time"
                      value={f.abre}
                      onChange={(e) => setH(h.map((x, i) => (i === f.i ? { ...x, abre: e.target.value } : x)))}
                      className="campo h-9 w-[6.5rem] px-2 text-sm"
                      aria-label={`${DIAS[dia]}: abre`}
                    />
                    <span className="text-tinta-3">a</span>
                    <input
                      type="time"
                      value={f.cierra}
                      onChange={(e) => setH(h.map((x, i) => (i === f.i ? { ...x, cierra: e.target.value } : x)))}
                      className="campo h-9 w-[6.5rem] px-2 text-sm"
                      aria-label={`${DIAS[dia]}: cierra`}
                    />
                    <button type="button" onClick={() => setH(h.filter((_, i) => i !== f.i))} className="grid size-8 place-items-center rounded-lg text-tinta-3 hover:bg-white hover:text-rojo" aria-label="Quitar franja">
                      <X className="size-4" />
                    </button>
                  </span>
                ))}
                {franjas.length < 3 && (
                  <button
                    type="button"
                    onClick={() => setH([...h, { dia, abre: franjas.length ? "16:00" : "09:00", cierra: franjas.length ? "20:00" : "13:00" }])}
                    className="inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-sm font-medium text-marca-700 hover:bg-marca-50"
                  >
                    <Plus className="size-4" /> {franjas.length ? "Otra franja" : "Abrir"}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <Pie pendiente={pendiente} error={error} sucio={sucio} onGuardar={() => guardar(h, () => setBase(h))} />
    </Tarjeta>
  );
}

function Venta({ c }: { c: ConfigTienda }) {
  const [m, setM] = useState<number | null>(c.compra_minima);
  const [base, setBase] = useState<number | null>(c.compra_minima);
  const { pendiente, error, guardar } = useGuardar("venta", "Compra mínima actualizada");
  return (
    <Tarjeta titulo="Venta mayorista" descripcion="La tienda no deja finalizar pedidos por debajo de este monto (el mostrador no tiene mínimo).">
      <CampoMonto etiqueta="Compra mínima por pedido" valor={m} onValor={setM} className="max-w-xs" ayuda="Poné 0 para vender sin mínimo." />
      <Pie pendiente={pendiente} error={error} sucio={m !== base} onGuardar={() => guardar({ compra_minima: m ?? 0 }, () => setBase(m))} />
    </Tarjeta>
  );
}

const NOMBRES_ENVIO: Record<string, string> = {
  retiro: "Retiro en el local",
  envio_local: "Envío en Córdoba Capital",
  envio_interior: "Envío al interior",
};

function Envios({ c }: { c: ConfigTienda }) {
  const completar = (lista: OpcionEnvio[]) =>
    (["retiro", "envio_local", "envio_interior"] as const).map(
      (id) =>
        lista.find((e) => e.id === id) ?? { id, nombre: NOMBRES_ENVIO[id], detalle: "", precio: null, gratis_desde: null, activo: false },
    );
  const [e, setE] = useState<OpcionEnvio[]>(completar(c.envios));
  const [base, setBase] = useState(JSON.stringify(completar(c.envios)));
  const { pendiente, error, guardar } = useGuardar("envios", "Formas de entrega guardadas");
  const set = (i: number, cambio: Partial<OpcionEnvio>) => setE(e.map((x, j) => (j === i ? { ...x, ...cambio } : x)));

  return (
    <Tarjeta titulo="Formas de entrega" descripcion="El cliente elige una al finalizar el pedido. Sin precio, se muestra “a coordinar por WhatsApp”.">
      <div className="space-y-3">
        {e.map((op, i) => (
          <div key={op.id} className={cn("rounded-2xl border border-aluminio p-4", !op.activo && "bg-vidrio/60")}>
            <Interruptor etiqueta={NOMBRES_ENVIO[op.id]} activo={op.activo} onCambiar={(v) => set(i, { activo: v })} />
            {op.activo && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Campo etiqueta="Nombre que ve el cliente" value={op.nombre} onChange={(ev) => set(i, { nombre: ev.target.value })} maxLength={60} />
                <Campo etiqueta="Detalle" value={op.detalle ?? ""} onChange={(ev) => set(i, { detalle: ev.target.value })} maxLength={160} />
                {op.id !== "retiro" && (
                  <>
                    <div>
                      <Interruptor
                        etiqueta="Costo fijo"
                        descripcion={op.precio == null ? "Ahora: a coordinar" : `Ahora: ${formatARS(op.precio)}`}
                        activo={op.precio != null}
                        onCambiar={(v) => set(i, { precio: v ? 0 : null, gratis_desde: v ? op.gratis_desde ?? null : null })}
                      />
                      {op.precio != null && <CampoMonto className="mt-3" etiqueta="Costo" valor={op.precio} onValor={(n) => set(i, { precio: n ?? 0 })} />}
                    </div>
                    {op.precio != null && (
                      <CampoMonto
                        etiqueta="Gratis desde (opcional)"
                        valor={op.gratis_desde ?? null}
                        onValor={(n) => set(i, { gratis_desde: n })}
                        ayuda="Pedidos desde este monto no pagan envío."
                      />
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <Pie
        pendiente={pendiente}
        error={error}
        sucio={JSON.stringify(e) !== base}
        onGuardar={() =>
          guardar(
            e.map((x) => ({ ...x, detalle: x.detalle ?? "", precio: x.id === "retiro" ? 0 : x.precio, gratis_desde: x.gratis_desde ?? null })),
            () => setBase(JSON.stringify(e)),
          )
        }
      />
    </Tarjeta>
  );
}

function Pagos({ c }: { c: ConfigTienda }) {
  const inicial = {
    pago_mercadopago: c.pago_mercadopago,
    pago_transferencia: c.pago_transferencia,
    pago_efectivo: c.pago_efectivo,
    descuento_transferencia: c.descuento_transferencia,
    transferencia_datos: c.transferencia_datos,
  };
  const [p, setP] = useState(inicial);
  const [base, setBase] = useState(JSON.stringify(inicial));
  const { pendiente, error, guardar } = useGuardar("pagos", "Medios de pago guardados");
  const t = p.transferencia_datos;
  const setT = (k: keyof typeof t) => (e: React.ChangeEvent<HTMLInputElement>) => setP({ ...p, transferencia_datos: { ...t, [k]: e.target.value } });

  return (
    <Tarjeta titulo="Medios de pago" descripcion="Lo que el cliente puede elegir al finalizar el pedido.">
      <div className="space-y-4">
        <Interruptor
          etiqueta="Mercado Pago"
          descripcion={c.mp_conectado ? "Tarjetas, débito y dinero en cuenta. La cuenta está conectada." : "Se ofrece recién cuando conectes la cuenta en Ajustes › Mercado Pago."}
          activo={p.pago_mercadopago}
          onCambiar={(v) => setP({ ...p, pago_mercadopago: v })}
        />
        <Interruptor etiqueta="Efectivo al retirar" descripcion="Solo para pedidos con retiro en el local." activo={p.pago_efectivo} onCambiar={(v) => setP({ ...p, pago_efectivo: v })} />
        <div className="rounded-2xl border border-aluminio p-4">
          <Interruptor
            etiqueta="Transferencia"
            descripcion="Al finalizar, el cliente ve estos datos y te manda el comprobante por WhatsApp."
            activo={p.pago_transferencia}
            onCambiar={(v) => setP({ ...p, pago_transferencia: v })}
          />
          {p.pago_transferencia && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Campo etiqueta="Titular" value={t.titular} onChange={setT("titular")} maxLength={80} />
              <Campo etiqueta="Banco o billetera" value={t.banco} onChange={setT("banco")} maxLength={80} />
              <Campo etiqueta="CBU / CVU" value={t.cbu} onChange={setT("cbu")} inputMode="numeric" maxLength={26} />
              <Campo etiqueta="Alias" value={t.alias} onChange={setT("alias")} maxLength={40} />
              <Campo etiqueta="CUIT (opcional)" value={t.cuit} onChange={setT("cuit")} maxLength={20} />
              <Campo
                etiqueta="Descuento por transferencia (%)"
                type="number"
                min={0}
                max={50}
                inputMode="decimal"
                value={p.descuento_transferencia}
                onChange={(e) => setP({ ...p, descuento_transferencia: Number(e.target.value) || 0 })}
                ayuda="0 = sin descuento."
              />
            </div>
          )}
        </div>
      </div>
      <Pie pendiente={pendiente} error={error} sucio={JSON.stringify(p) !== base} onGuardar={() => guardar(p, () => setBase(JSON.stringify(p)))} />
    </Tarjeta>
  );
}

export function FormAjustes({ config }: { config: ConfigTienda }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="space-y-4">
        <Tienda c={config} />
        <Venta c={config} />
      </div>
      <div className="space-y-4">
        <Horarios c={config} />
        <Envios c={config} />
        <Pagos c={config} />
      </div>
    </div>
  );
}
