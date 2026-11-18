"use client";

import { Banknote, CheckCircle2, CreditCard, Landmark, Minus, Plus, ScanLine, Search, Smartphone, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Boton } from "@/components/ui/Boton";
import { ImagenProducto } from "@/components/ui/ImagenProducto";
import { registrarVenta } from "@/lib/actions/mostrador";
import { buscar } from "@/lib/busqueda";
import type { ItemIndice } from "@/lib/datos/catalogo";
import { formatARS, plural } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CampoMonto } from "../formulario";

type Renglon = { item: ItemIndice; cantidad: number };
type Medio = "efectivo" | "transferencia" | "tarjeta" | "mercadopago";

const MEDIOS: { id: Medio; texto: string; icono: React.ReactNode }[] = [
  { id: "efectivo", texto: "Efectivo", icono: <Banknote className="size-5" /> },
  { id: "transferencia", texto: "Transferencia", icono: <Landmark className="size-5" /> },
  { id: "tarjeta", texto: "Tarjeta", icono: <CreditCard className="size-5" /> },
  { id: "mercadopago", texto: "Mercado Pago", icono: <Smartphone className="size-5" /> },
];

let indiceCache: ItemIndice[] | null = null;

export function Mostrador() {
  const [indice, setIndice] = useState<ItemIndice[] | null>(indiceCache);
  const [errorIndice, setErrorIndice] = useState(false);
  const [consulta, setConsulta] = useState("");
  const [sel, setSel] = useState(0);
  const [ticket, setTicket] = useState<Renglon[]>([]);
  const [medio, setMedio] = useState<Medio>("efectivo");
  const [descuento, setDescuento] = useState<number | null>(null);
  const [cliente, setCliente] = useState({ nombre: "", telefono: "" });
  const [hecha, setHecha] = useState<{ numero: number; total: number } | null>(null);
  const [pendiente, empezar] = useTransition();
  const entrada = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (indiceCache) return;
    fetch("/api/indice")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: ItemIndice[]) => {
        indiceCache = d;
        setIndice(d);
      })
      .catch(() => setErrorIndice(true));
  }, []);

  const resultados = useMemo(() => (indice && consulta.trim() ? buscar(indice, consulta, 8) : []), [indice, consulta]);

  const subtotal = ticket.reduce((t, r) => t + r.item.p * r.cantidad, 0);
  const desc = Math.min(descuento ?? 0, subtotal);
  const total = subtotal - desc;
  const unidades = ticket.reduce((t, r) => t + r.cantidad, 0);

  function agregar(item: ItemIndice, cantidad = 1) {
    if (item.x !== null && item.x <= 0) {
      toast.error(`${item.n} no tiene stock.`);
      return;
    }
    setTicket((t) => {
      const ya = t.find((r) => r.item.i === item.i);
      const max = item.x ?? 100000;
      if (ya) return t.map((r) => (r.item.i === item.i ? { ...r, cantidad: Math.min(max, r.cantidad + cantidad) } : r));
      return [{ item, cantidad: Math.min(max, Math.max(item.q, cantidad)) }, ...t];
    });
    setConsulta("");
    entrada.current?.focus();
  }

  function fijar(id: string, n: number) {
    setTicket((t) =>
      n <= 0 ? t.filter((r) => r.item.i !== id) : t.map((r) => (r.item.i === id ? { ...r, cantidad: Math.min(r.item.x ?? 100000, n) } : r)),
    );
  }

  function cobrar() {
    if (ticket.length === 0) return;
    empezar(async () => {
      const r = await registrarVenta({
        items: ticket.map((x) => ({ producto_id: x.item.i, cantidad: x.cantidad })),
        metodo_pago: medio,
        descuento: desc,
        cliente: cliente.nombre || cliente.telefono ? cliente : undefined,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setHecha({ numero: r.data.numero, total: r.data.total });
    });
  }

  function nueva() {
    setTicket([]);
    setDescuento(null);
    setCliente({ nombre: "", telefono: "" });
    setMedio("efectivo");
    setHecha(null);
    setTimeout(() => entrada.current?.focus(), 30);
  }

  if (hecha) {
    return (
      <div className="mx-auto max-w-md rounded-[1.5rem] border border-aluminio bg-white p-8 text-center shadow-[var(--shadow-pane)] entrar">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#e2f4ea] text-verde">
          <CheckCircle2 className="size-9" />
        </span>
        <p className="mt-5 text-[1.35rem] font-bold text-tinta">Venta registrada</p>
        <p className="tabular mt-1 text-tinta-2">
          #{hecha.numero} · {formatARS(hecha.total)}
        </p>
        <div className="mt-7 flex flex-col gap-2">
          <Boton tam="lg" onClick={nueva} autoFocus>
            Nueva venta
          </Boton>
          <Boton asChild variante="claro" tam="lg">
            <Link href={`/panel/pedidos/${hecha.numero}`}>Ver el detalle</Link>
          </Boton>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,1fr)]">
      <div className="space-y-4">
        <div className="relative">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-marca-500" />
            <input
              ref={entrada}
              value={consulta}
              onChange={(e) => {
                setConsulta(e.target.value);
                setSel(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setSel((s) => Math.min(resultados.length - 1, s + 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setSel((s) => Math.max(0, s - 1));
                } else if (e.key === "Enter" && resultados[sel]) {
                  e.preventDefault();
                  agregar(resultados[sel].item);
                } else if (e.key === "Escape") setConsulta("");
              }}
              autoFocus
              placeholder={indice ? "Código o nombre del producto…" : "Cargando catálogo…"}
              disabled={!indice && !errorIndice}
              className="campo h-14 rounded-2xl pl-12 text-[1.05rem]"
              aria-label="Buscar producto por código o nombre"
              aria-controls="resultados-mostrador"
              autoComplete="off"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 items-center gap-1.5 text-xs text-tinta-3 sm:flex">
              <ScanLine className="size-4" /> Enter agrega
            </span>
          </div>
          {errorIndice && <p className="mt-2 text-sm text-rojo">No pudimos cargar el catálogo. Recargá la página.</p>}
          {consulta.trim() && indice && (
            <ul
              id="resultados-mostrador"
              role="listbox"
              className="absolute inset-x-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-2xl border border-aluminio bg-white shadow-[var(--shadow-flotante)]"
            >
              {resultados.length === 0 ? (
                <li className="px-4 py-6 text-center text-[0.92rem] text-tinta-3">Sin resultados para “{consulta.trim()}”.</li>
              ) : (
                resultados.map((r, i) => {
                  const agotado = r.item.x !== null && r.item.x <= 0;
                  return (
                    <li key={r.item.i} role="option" aria-selected={i === sel}>
                      <button
                        type="button"
                        onMouseEnter={() => setSel(i)}
                        onClick={() => agregar(r.item)}
                        className={cn("flex w-full items-center gap-3 px-3 py-2 text-left", i === sel && "bg-marca-50", agotado && "opacity-60")}
                      >
                        <ImagenProducto ruta={r.item.m} alt="" className="size-11 shrink-0 rounded-lg border border-aluminio" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[0.93rem] text-tinta">{r.item.n}</span>
                          <span className="tabular text-[0.76rem] text-tinta-3">
                            Cód. {r.item.c}
                            {r.item.x !== null && ` · stock ${r.item.x}`}
                            {r.exacto && <span className="ml-1.5 font-semibold text-marca-600">código exacto</span>}
                          </span>
                        </span>
                        <span className="tabular font-bold text-tinta">{formatARS(r.item.p)}</span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          )}
        </div>

        <section className="rounded-[var(--radius-pane)] border border-aluminio bg-white">
          <div className="flex items-center justify-between border-b border-aluminio px-4 py-3 sm:px-5">
            <h2 className="font-semibold text-tinta">Ticket</h2>
            {ticket.length > 0 && (
              <button type="button" onClick={() => setTicket([])} className="text-sm font-medium text-tinta-3 hover:text-rojo">
                Vaciar
              </button>
            )}
          </div>
          {ticket.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="font-semibold text-tinta">El ticket está vacío</p>
              <p className="mt-1 text-[0.92rem] text-tinta-2">Escribí el código o el nombre arriba y apretá Enter.</p>
            </div>
          ) : (
            <ul className="divide-y divide-aluminio">
              {ticket.map((r) => (
                <li key={r.item.i} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                  <ImagenProducto ruta={r.item.m} alt="" className="size-12 shrink-0 rounded-lg border border-aluminio" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.92rem] font-medium text-tinta">{r.item.n}</p>
                    <p className="tabular text-[0.76rem] text-tinta-3">
                      Cód. {r.item.c} · {formatARS(r.item.p)} c/u
                    </p>
                  </div>
                  <div className="flex h-10 items-stretch overflow-hidden rounded-xl border border-aluminio-2">
                    <button
                      type="button"
                      onClick={() => fijar(r.item.i, r.cantidad - 1)}
                      className="grid w-9 place-items-center text-tinta-2 hover:bg-vidrio"
                      aria-label={r.cantidad <= 1 ? "Quitar" : "Restar una unidad"}
                    >
                      {r.cantidad <= 1 ? <Trash2 className="size-4" /> : <Minus className="size-4" />}
                    </button>
                    <input
                      value={r.cantidad}
                      onChange={(e) => fijar(r.item.i, parseInt(e.target.value.replace(/\D/g, "") || "0", 10))}
                      inputMode="numeric"
                      className="tabular w-12 border-x border-aluminio text-center font-bold outline-none focus:bg-marca-50"
                      aria-label={`Cantidad de ${r.item.n}`}
                    />
                    <button type="button" onClick={() => fijar(r.item.i, r.cantidad + 1)} className="grid w-9 place-items-center text-tinta-2 hover:bg-vidrio" aria-label="Sumar una unidad">
                      <Plus className="size-4" />
                    </button>
                  </div>
                  <span className="tabular w-24 text-right font-bold text-tinta">{formatARS(r.item.p * r.cantidad)}</span>
                  <button
                    type="button"
                    onClick={() => fijar(r.item.i, 0)}
                    className="hidden size-8 place-items-center rounded-lg text-tinta-3 hover:bg-vidrio hover:text-rojo sm:grid"
                    aria-label={`Quitar ${r.item.n}`}
                  >
                    <X className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
        <section className="rounded-[var(--radius-pane)] border border-aluminio bg-white p-4 sm:p-5">
          <h2 className="mb-3 font-semibold text-tinta">Medio de pago</h2>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Medio de pago">
            {MEDIOS.map((m) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={medio === m.id}
                onClick={() => setMedio(m.id)}
                className="presionable flex h-14 items-center gap-2.5 rounded-xl border border-aluminio-2 bg-white px-3 text-left text-[0.92rem] font-medium text-tinta transition-colors aria-checked:border-marca-600 aria-checked:bg-marca-50 aria-checked:text-marca-800 aria-checked:shadow-[0_0_0_1px_var(--color-marca-600)]"
              >
                <span className="text-marca-600">{m.icono}</span>
                {m.texto}
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="col-span-2 block">
              <span className="mb-1.5 block text-[0.88rem] font-medium text-tinta">Cliente (opcional)</span>
              <input
                value={cliente.nombre}
                onChange={(e) => setCliente((c) => ({ ...c, nombre: e.target.value }))}
                placeholder="Nombre o negocio"
                className="campo h-11"
              />
            </label>
            <input
              value={cliente.telefono}
              onChange={(e) => setCliente((c) => ({ ...c, telefono: e.target.value }))}
              placeholder="Teléfono"
              inputMode="tel"
              className="campo col-span-2 h-11"
              aria-label="Teléfono del cliente (opcional)"
            />
          </div>
          <CampoMonto className="mt-3" etiqueta="Descuento ($)" valor={descuento} onValor={setDescuento} placeholder="0" />
        </section>

        <section className="cartel rounded-[var(--radius-pane)] p-5">
          <span className="cartel-luz" />
          <dl className="space-y-1.5 text-[0.95rem]">
            <div className="flex justify-between text-marca-100">
              <dt>Subtotal · {plural(unidades, "unidad", "unidades")}</dt>
              <dd className="tabular">{formatARS(subtotal)}</dd>
            </div>
            {desc > 0 && (
              <div className="flex justify-between text-marca-100">
                <dt>Descuento</dt>
                <dd className="tabular">− {formatARS(desc)}</dd>
              </div>
            )}
            <div className="flex items-baseline justify-between pt-2">
              <dt className="text-lg font-semibold text-white">Total</dt>
              <dd className="tabular text-[2rem] font-bold leading-none text-white">{formatARS(total)}</dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={cobrar}
            disabled={ticket.length === 0 || pendiente}
            className="presionable mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-white text-[1.05rem] font-bold text-marca-800 shadow-[0_8px_20px_-10px_rgb(0_0_0/0.6)] transition-opacity disabled:opacity-50"
          >
            {pendiente ? (
              <span className="size-5 animate-spin rounded-full border-2 border-marca-700 border-r-transparent" />
            ) : (
              <>Cobrar {formatARS(total)}</>
            )}
          </button>
        </section>
      </aside>
    </div>
  );
}
