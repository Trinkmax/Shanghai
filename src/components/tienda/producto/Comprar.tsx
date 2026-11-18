"use client";

import { Check, Copy, MessageCircle, Plus, Share2 } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { ImagenProducto } from "@/components/ui/ImagenProducto";
import { Precio } from "@/components/ui/Precio";
import { subtotalDe, useCarrito, useCarritoHidratado, useCantidadDe } from "@/lib/carrito";
import { formatARS, linkWhatsApp } from "@/lib/format";
import type { ProductoVista } from "@/lib/tienda";
import { cn } from "@/lib/utils";
import { useTienda } from "../ContextoTienda";
import { ControlCantidad } from "../ControlCantidad";
import { CajaProgreso } from "../MedidorMinimo";
import { aCarrito, BotonFavorito } from "../TarjetaProducto";
import { useAgregar } from "../useAgregar";

function atajos(minimo: number) {
  const base = minimo > 1 ? [minimo, minimo * 2, minimo * 4, minimo * 8] : [1, 6, 12, 24];
  return Array.from(new Set(base));
}

export function Comprar({ p }: { p: ProductoVista }) {
  const { compra_minima, whatsapp } = useTienda();
  const hidratado = useCarritoHidratado();
  const enPedido = useCantidadDe(p.id);
  const subtotal = useCarrito((s) => subtotalDe(s.items));
  const agregar = useAgregar();
  const reducir = useReducedMotion();
  const [cantidad, setCantidad] = useState(p.cantidad_minima);
  const [hecho, setHecho] = useState(false);
  const boton = useRef<HTMLButtonElement>(null);
  const bloque = useRef<HTMLDivElement>(null);
  const [fijo, setFijo] = useState(false);
  const montado = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const maximo = p.stock ?? null;
  const yaTiene = hidratado ? enPedido : 0;
  const importe = cantidad * p.precio_final;
  const subtotalActual = hidratado ? subtotal : 0;
  const despues = subtotalActual + importe;
  const falta = Math.max(0, compra_minima - despues);
  const opciones = useMemo(() => atajos(p.cantidad_minima).filter((n) => maximo == null || n <= maximo), [p.cantidad_minima, maximo]);

  // Barra fija en el celular cuando el botón principal sale de la pantalla.
  useEffect(() => {
    const el = bloque.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setFijo(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  function sumar(origen?: HTMLElement | null) {
    if (p.agotado) return;
    agregar(aCarrito(p), cantidad, origen ?? boton.current);
    setHecho(true);
    setTimeout(() => setHecho(false), 1400);
  }

  async function compartir() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: p.nombre, text: `${p.nombre} · ${formatARS(p.precio_final)}`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado");
    } catch {
      /* cancelado */
    }
  }

  async function copiarCodigo() {
    try {
      await navigator.clipboard.writeText(p.codigo);
      toast.success(`Código ${p.codigo} copiado`);
    } catch {
      /* sin portapapeles */
    }
  }

  const textoBoton = p.agotado
    ? "Sin stock"
    : yaTiene > 0
      ? `Sumar ${cantidad} más`
      : `Agregar ${cantidad} al pedido`;

  return (
    <div>
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        <Precio monto={p.precio_final} tachado={p.precio_lista} tam="xl" />
        {p.descuento > 0 && <span className="vinilo vinilo-ambar mb-1.5 !text-[0.8rem]">−{p.descuento}%</span>}
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.88rem] text-tinta-3">
        <span>Precio mayorista por unidad</span>
        {p.cantidad_minima > 1 && <span className="font-semibold text-tinta-2">· se vende de a {p.cantidad_minima} u. como mínimo</span>}
        <button type="button" onClick={copiarCodigo} className="tabular inline-flex items-center gap-1 rounded-md px-1 py-0.5 hover:bg-vidrio hover:text-tinta" title="Copiar código">
          · Cód. {p.codigo} <Copy className="size-3.5" />
        </button>
      </p>
      {p.stock != null && !p.agotado && p.stock <= 10 && (
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-ambar/25 px-2.5 py-1 text-[0.85rem] font-semibold text-ambar-tinta">
          Quedan {p.stock} unidades
        </p>
      )}

      <div ref={bloque} className="mt-6 rounded-[1.25rem] border border-aluminio bg-white p-4 sm:p-5">
        {!p.agotado && (
          <div className="mb-4">
            <p className="mb-2 text-[0.85rem] font-medium text-tinta-2">¿Cuántas unidades?</p>
            <div className="flex flex-wrap gap-2">
              {opciones.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCantidad(n)}
                  aria-pressed={cantidad === n}
                  className={cn(
                    "presionable tabular h-10 min-w-14 rounded-xl border px-3 text-[0.92rem] font-semibold transition-colors",
                    cantidad === n ? "border-marca-600 bg-marca-600 text-white" : "border-aluminio-2 bg-white text-tinta hover:border-tinta-3",
                  )}
                >
                  ×{n}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2.5 sm:flex-row">
          {!p.agotado && (
            <ControlCantidad
              tam="lg"
              valor={cantidad}
              minimo={p.cantidad_minima}
              maximo={maximo}
              onCambiar={setCantidad}
              className="w-full justify-between sm:w-auto [&>button:nth-child(2)]:flex-1"
              etiqueta={`Cantidad de ${p.nombre}`}
            />
          )}
          <button
            ref={boton}
            type="button"
            disabled={p.agotado}
            onClick={() => sumar()}
            className="cartel presionable relative flex h-14 flex-1 items-center justify-center gap-2 overflow-hidden rounded-2xl px-5 text-base font-semibold disabled:opacity-50"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {hecho ? (
                <motion.span
                  key="hecho"
                  initial={reducir ? { opacity: 0 } : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reducir ? { opacity: 0 } : { opacity: 0, y: -12 }}
                  transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                  className="inline-flex items-center gap-2"
                >
                  <Check className="size-5" strokeWidth={3} /> Agregado
                </motion.span>
              ) : (
                <motion.span
                  key="normal"
                  initial={reducir ? { opacity: 0 } : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reducir ? { opacity: 0 } : { opacity: 0, y: -12 }}
                  transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                  className="inline-flex items-center gap-2"
                >
                  {!p.agotado && <Plus className="size-5" strokeWidth={2.5} />}
                  {textoBoton}
                  {!p.agotado && <span className="tabular font-normal text-marca-100">· {formatARS(importe)}</span>}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        {!p.agotado && (
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-vidrio p-3" aria-live="polite">
            <CajaProgreso progreso={despues / compra_minima} className="size-9" />
            <p className="text-[0.88rem] leading-snug text-tinta-2">
              {yaTiene > 0 && (
                <span className="font-semibold text-marca-700">Ya tenés {yaTiene} en tu pedido. </span>
              )}
              Con {cantidad === 1 ? "esta unidad" : `estas ${cantidad} u.`} tu pedido queda en{" "}
              <span className="tabular font-semibold text-tinta">{formatARS(despues)}</span>
              {falta > 0 ? (
                <>
                  {" "}· te faltan <span className="tabular font-semibold text-tinta">{formatARS(falta)}</span> para el mínimo.
                </>
              ) : (
                <span className="font-semibold text-verde"> · ¡llegás a la compra mínima!</span>
              )}
            </p>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={linkWhatsApp(whatsapp, `Hola! Quiero consultar por ${p.nombre} (Cód. ${p.codigo})`)}
          target="_blank"
          rel="noreferrer"
          className="presionable inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-aluminio-2 bg-white px-4 text-[0.92rem] font-semibold text-tinta hover:border-tinta-3 sm:flex-none"
        >
          <MessageCircle className="size-4 text-verde" /> Consultar por WhatsApp
        </a>
        <button
          type="button"
          onClick={compartir}
          className="presionable inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-aluminio-2 bg-white px-4 text-[0.92rem] font-semibold text-tinta hover:border-tinta-3"
        >
          <Share2 className="size-4 text-tinta-3" /> Compartir
        </button>
        <BotonFavorito id={p.id} nombre={p.nombre} className="size-11 rounded-xl border border-aluminio-2 bg-white" />
      </div>

      {montado &&
        createPortal(
          <AnimatePresence>
            {fijo && !p.agotado && (
              <motion.div
                initial={reducir ? { opacity: 0 } : { y: "110%" }}
                animate={reducir ? { opacity: 1 } : { y: 0 }}
                exit={reducir ? { opacity: 0 } : { y: "110%" }}
                transition={{ type: "spring", duration: 0.4, bounce: 0.12 }}
                className="fixed inset-x-2 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 flex items-center gap-3 rounded-2xl border border-aluminio bg-white/95 p-2 pl-2.5 shadow-[var(--shadow-flotante)] backdrop-blur-md lg:hidden"
              >
                <ImagenProducto ruta={p.imagenes[0]} alt="" tam="xs" className="size-11 shrink-0 rounded-xl border border-aluminio" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.82rem] text-tinta-2">{p.nombre}</p>
                  <p className="tabular text-[0.95rem] font-bold text-tinta">
                    {cantidad} u. · {formatARS(importe)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => sumar(e.currentTarget)}
                  className="cartel presionable inline-flex h-11 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold"
                >
                  {hecho ? <Check className="size-4" strokeWidth={3} /> : <Plus className="size-4" strokeWidth={2.5} />}
                  {hecho ? "Listo" : "Agregar"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}
