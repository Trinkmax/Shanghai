"use client";

import { Banknote, Check, Copy, CreditCard, Landmark, MapPin, MessageCircle, Navigation, RotateCcw, Share2, Truck, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Isotipo } from "@/components/marca/Isotipo";
import { Boton } from "@/components/ui/Boton";
import { ImagenProducto } from "@/components/ui/ImagenProducto";
import { pagarPedido } from "@/lib/actions/checkout";
import { useCarrito } from "@/lib/carrito";
import type { PedidoPublico } from "@/lib/datos/pedidos";
import { formatARS, formatFechaHora, linkWhatsApp } from "@/lib/format";
import { useMisPedidos } from "@/lib/locales";
import { PASOS_PEDIDO, TEXTO_ESTADO, TEXTO_METODO_PAGO, type DatosTransferencia } from "@/lib/tienda";
import { cn } from "@/lib/utils";
import { useTienda } from "../ContextoTienda";

function Lamparas({ estado }: { estado: PedidoPublico["estado"] }) {
  const reducir = useReducedMotion();
  if (estado === "cancelado") {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-[#fdecec] p-4 text-rojo">
        <X className="size-5" />
        <p className="font-semibold">Este pedido fue cancelado.</p>
      </div>
    );
  }
  const actual = estado === "enviado" ? PASOS_PEDIDO.indexOf("listo") + 0.5 : PASOS_PEDIDO.indexOf(estado);
  return (
    <ol className="grid grid-cols-5 gap-1.5" aria-label="Estado del pedido">
      {PASOS_PEDIDO.map((p, i) => {
        const encendida = i <= actual;
        const esActual = Math.floor(actual) === i;
        return (
          <li key={p} className="flex flex-col items-center gap-2 text-center" aria-current={esActual ? "step" : undefined}>
            <span className="relative flex w-full items-center">
              <span className={cn("h-1 flex-1 rounded-full", i === 0 ? "bg-transparent" : encendida ? "bg-marca-500" : "bg-vidrio-2")} />
              <motion.span
                initial={false}
                animate={encendida && !reducir ? { scale: [0.92, 1] } : { scale: 1 }}
                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                className={cn(
                  "relative grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold sm:size-10",
                  encendida ? "cartel" : "border-2 border-aluminio bg-white text-tinta-3",
                  esActual && "shadow-[0_0_0_5px_rgb(92_99_170/0.18),0_10px_24px_-8px_rgb(55_42_132/0.8)]",
                )}
              >
                {encendida && <span className="cartel-luz" />}
                {encendida && !esActual ? <Check className="size-4" strokeWidth={3} /> : i + 1}
              </motion.span>
              <span className={cn("h-1 flex-1 rounded-full", i === PASOS_PEDIDO.length - 1 ? "bg-transparent" : i < actual ? "bg-marca-500" : "bg-vidrio-2")} />
            </span>
            <span className={cn("text-[0.72rem] leading-tight sm:text-[0.8rem]", encendida ? "font-semibold text-tinta" : "text-tinta-3")}>
              {p === "listo" && estado === "enviado" ? "Despachado" : TEXTO_ESTADO[p]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Copiable({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  if (!valor) return null;
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="text-[0.75rem] text-tinta-3">{etiqueta}</p>
        <p className="tabular truncate font-semibold text-tinta">{valor}</p>
      </div>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(valor);
            toast.success(`${etiqueta} copiado`);
          } catch {
            /* sin portapapeles */
          }
        }}
        className="presionable inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-aluminio-2 bg-white px-3 text-sm font-medium text-tinta hover:border-tinta-3"
      >
        <Copy className="size-3.5" /> Copiar
      </button>
    </div>
  );
}

export function Seguimiento({
  token,
  inicial,
  transferencia,
  nuevo,
  resultadoPago,
}: {
  token: string;
  inicial: PedidoPublico;
  transferencia: DatosTransferencia;
  nuevo: boolean;
  resultadoPago: string | null;
}) {
  const tienda = useTienda();
  const [p, setP] = useState(inicial);
  const [pagando, iniciarPago] = useTransition();
  const guardar = useMisPedidos((s) => s.guardar);
  const agregar = useCarrito((s) => s.agregar);
  const abrirCarrito = useCarrito((s) => s.abrir);
  const consultas = useRef(0);

  useEffect(() => {
    guardar({ token, numero: p.numero, total: Number(p.total), fecha: p.creado_en, metodo: p.metodo_pago });
  }, [guardar, token, p.numero, p.total, p.creado_en, p.metodo_pago]);

  // Mientras el pago de Mercado Pago está en camino, consultamos el estado cada pocos segundos.
  const esperandoPago = p.metodo_pago === "mercadopago" && ["pendiente", "en_proceso"].includes(p.estado_pago) && p.estado === "pendiente";
  useEffect(() => {
    const intervalo = esperandoPago ? (resultadoPago ? 4000 : 10000) : 30000;
    const t = setInterval(async () => {
      if (document.hidden || consultas.current > 180) return;
      consultas.current++;
      try {
        const r = await fetch(`/api/pedido/${token}`, { cache: "no-store" });
        if (r.ok) {
          const nuevoEstado = (await r.json()) as PedidoPublico;
          setP((viejo) => {
            if (viejo.estado_pago !== "aprobado" && nuevoEstado.estado_pago === "aprobado") toast.success("¡Pago acreditado! Ya estamos con tu pedido.");
            return nuevoEstado;
          });
        }
      } catch {
        /* sin conexión: se reintenta */
      }
    }, intervalo);
    return () => clearInterval(t);
  }, [esperandoPago, resultadoPago, token]);

  function pagar() {
    iniciarPago(async () => {
      const r = await pagarPedido(token);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      window.location.assign(r.data.init_point);
    });
  }

  function repetir() {
    let n = 0;
    const faltan: string[] = [];
    for (const it of p.items) {
      if (!it.producto_id || !it.slug || !it.disponible) {
        faltan.push(it.nombre);
        continue;
      }
      agregar(
        {
          id: it.producto_id,
          codigo: it.codigo,
          slug: it.slug,
          nombre: it.nombre,
          imagen: it.imagen,
          precio_final: Number(it.precio_actual ?? it.precio_unitario),
          precio_lista: null,
          cantidad_minima: it.cantidad_minima,
          stock: it.stock,
        },
        it.cantidad,
      );
      n++;
    }
    toast.success(`Sumamos ${n} ${n === 1 ? "producto" : "productos"} a tu pedido`, {
      description: faltan.length
        ? `No están disponibles: ${faltan.slice(0, 3).join(", ")}${faltan.length > 3 ? "…" : ""}`
        : "Con los precios de hoy. Revisá cantidades antes de confirmar.",
    });
    abrirCarrito();
  }

  async function compartir() {
    const url = window.location.origin + `/pedido/${token}`;
    try {
      if (navigator.share) await navigator.share({ title: `Pedido #${p.numero} · Shangai Center`, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Link del pedido copiado");
      }
    } catch {
      /* cancelado */
    }
  }

  const pagado = p.estado_pago === "aprobado";
  const mapa = tienda.mapa_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${tienda.direccion}, ${tienda.ciudad}, Argentina`)}`;
  const nombreCorto = p.cliente_nombre.split(" ")[0];
  const msjComprobante = `Hola! Te envío el comprobante de la transferencia del pedido #${p.numero} por ${formatARS(p.total)}.`;
  const hayDatosBanco = Boolean(transferencia.cbu || transferencia.alias);

  const titulo =
    p.estado === "cancelado"
      ? `Pedido #${p.numero}`
      : resultadoPago === "ok" && !pagado
        ? "Estamos confirmando tu pago"
        : nuevo || resultadoPago
          ? `¡Gracias, ${nombreCorto}!`
          : `Pedido #${p.numero}`;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-6">
      <div className="space-y-4">
        <section className="relative overflow-hidden rounded-[1.5rem] border border-aluminio bg-white p-5 sm:p-8">
          <Isotipo className="pointer-events-none absolute -right-8 -top-8 size-44 text-marca-50" grosor={7} />
          <h1 className="rotulo relative text-[clamp(1.6rem,4.4vw,2.6rem)] text-marca-700">{titulo}</h1>
          <p className="tabular relative mt-2 text-sm font-semibold text-marca-600">
            Pedido #{p.numero} · {formatFechaHora(p.creado_en)}
          </p>
          <p className="relative mt-2 max-w-[52ch] text-[0.98rem] text-tinta-2">
            {p.estado === "cancelado"
              ? "Si fue un error, escribinos por WhatsApp y lo revisamos."
              : resultadoPago === "error"
                ? "El pago no se completó. Podés intentarlo de nuevo o elegir otro medio hablando con nosotros."
                : resultadoPago === "ok" && !pagado
                  ? "Mercado Pago ya nos está avisando. Esto se actualiza solo en unos segundos."
                  : "Tu pedido quedó registrado. Guardá este link: acá vas a ver cada cambio de estado."}
          </p>
          <div className="relative mt-7">
            <Lamparas estado={p.estado} />
          </div>
        </section>

        {/* Pago */}
        <section className="rounded-[1.25rem] border border-aluminio bg-white p-5 sm:p-6" aria-labelledby="titulo-pago">
          <h2 id="titulo-pago" className="flex items-center gap-2.5 text-lg font-bold text-tinta">
            {p.metodo_pago === "mercadopago" ? (
              <CreditCard className="size-5 text-[#009ee3]" />
            ) : p.metodo_pago === "transferencia" ? (
              <Landmark className="size-5 text-marca-600" />
            ) : (
              <Banknote className="size-5 text-verde" />
            )}
            Pago · {TEXTO_METODO_PAGO[p.metodo_pago]}
            {pagado && <span className="vinilo vinilo-marca ml-auto">Pagado</span>}
          </h2>

          {pagado ? (
            <p className="mt-3 flex items-center gap-2 text-[0.95rem] text-tinta-2">
              <Check className="size-4 text-verde" strokeWidth={3} /> Recibimos el pago de <span className="tabular font-semibold text-tinta">{formatARS(p.total)}</span>.
            </p>
          ) : p.metodo_pago === "mercadopago" ? (
            <div className="mt-3">
              <p className="text-[0.95rem] text-tinta-2">
                {p.estado_pago === "rechazado"
                  ? "El pago fue rechazado. Probá de nuevo, con otra tarjeta o medio."
                  : p.estado_pago === "en_proceso"
                    ? "Mercado Pago está revisando el pago. Te avisamos acá apenas se acredite."
                    : "Todavía no recibimos el pago."}
              </p>
              {p.puede_pagar && (
                <Boton tam="lg" className="mt-4 w-full sm:w-auto" cargando={pagando} onClick={pagar}>
                  <CreditCard className="size-5" /> Pagar {formatARS(p.total)} con Mercado Pago
                </Boton>
              )}
            </div>
          ) : p.metodo_pago === "transferencia" ? (
            <div className="mt-3">
              <p className="text-[0.95rem] text-tinta-2">
                Transferí <span className="tabular font-semibold text-tinta">{formatARS(p.total)}</span> y mandanos el comprobante por WhatsApp.
              </p>
              {hayDatosBanco ? (
                <div className="mt-3 divide-y divide-aluminio rounded-xl border border-aluminio px-4">
                  <Copiable etiqueta="Alias" valor={transferencia.alias} />
                  <Copiable etiqueta="CBU / CVU" valor={transferencia.cbu} />
                  <Copiable etiqueta="Titular" valor={transferencia.titular} />
                  <Copiable etiqueta="Banco" valor={transferencia.banco} />
                  <Copiable etiqueta="CUIT" valor={transferencia.cuit} />
                </div>
              ) : (
                <p className="mt-3 rounded-xl bg-vidrio p-3.5 text-[0.9rem] text-tinta-2">Te pasamos los datos bancarios por WhatsApp.</p>
              )}
              <Boton asChild variante="wa" tam="lg" className="mt-4 w-full sm:w-auto">
                <a href={linkWhatsApp(tienda.whatsapp, msjComprobante)} target="_blank" rel="noreferrer">
                  <MessageCircle className="size-5" /> {hayDatosBanco ? "Enviar comprobante" : "Pedir datos por WhatsApp"}
                </a>
              </Boton>
            </div>
          ) : (
            <p className="mt-3 text-[0.95rem] text-tinta-2">
              Pagás <span className="tabular font-semibold text-tinta">{formatARS(p.total)}</span> en efectivo cuando retirás en el local.
            </p>
          )}
        </section>

        {/* Entrega */}
        <section className="rounded-[1.25rem] border border-aluminio bg-white p-5 sm:p-6" aria-labelledby="titulo-entrega">
          <h2 id="titulo-entrega" className="flex items-center gap-2.5 text-lg font-bold text-tinta">
            {p.entrega_metodo === "retiro" ? <MapPin className="size-5 text-marca-600" /> : <Truck className="size-5 text-marca-600" />}
            {p.entrega_nombre}
          </h2>
          {p.entrega_metodo === "retiro" ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[0.95rem] text-tinta-2">
                <span className="font-semibold text-tinta">{tienda.direccion}</span>, {tienda.ciudad}. Te avisamos cuando esté listo.
              </p>
              <a href={mapa} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-marca-700 hover:underline">
                <Navigation className="size-4" /> Cómo llegar
              </a>
            </div>
          ) : (
            <p className="mt-3 text-[0.95rem] text-tinta-2">
              {[p.entrega_direccion?.calle, p.entrega_direccion?.ciudad, p.entrega_direccion?.provincia].filter(Boolean).join(", ")}
              {p.entrega_direccion?.referencias && <span className="block text-tinta-3">{p.entrega_direccion.referencias}</span>}
              <span className="mt-1 block">
                {p.costo_envio == null ? "Coordinamos día y costo del envío por WhatsApp." : `Envío: ${formatARS(p.costo_envio)}.`}
              </span>
            </p>
          )}
        </section>

        {p.eventos.length > 0 && (
          <section className="rounded-[1.25rem] border border-aluminio bg-white p-5 sm:p-6" aria-labelledby="titulo-historial">
            <h2 id="titulo-historial" className="text-lg font-bold text-tinta">
              Historial
            </h2>
            <ol className="mt-4 space-y-3 border-l-2 border-aluminio pl-4">
              {[...p.eventos].reverse().map((e, i) => (
                <li key={i} className="relative">
                  <span className={cn("absolute -left-[1.42rem] top-1.5 size-2.5 rounded-full", i === 0 ? "bg-marca-500" : "bg-aluminio-2")} />
                  <p className="text-[0.92rem] font-medium text-tinta">{e.detalle}</p>
                  <p className="tabular text-[0.78rem] text-tinta-3">{formatFechaHora(e.creado_en)}</p>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>

      <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-[1.25rem] border border-aluminio bg-white">
          <ul className="max-h-[46vh] divide-y divide-aluminio overflow-y-auto px-5">
            {p.items.map((it, i) => (
              <li key={i} className="flex items-center gap-3 py-3">
                <span className="relative shrink-0">
                  <ImagenProducto ruta={it.imagen} alt="" className="size-12 rounded-lg border border-aluminio" />
                  <span className="tabular absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-marca-700 px-1 text-[0.68rem] font-bold text-white">
                    {it.cantidad}
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-[0.85rem] leading-snug text-tinta">{it.nombre}</span>
                  <span className="tabular block text-[0.75rem] text-tinta-3">{formatARS(it.precio_unitario)} c/u</span>
                </span>
                <span className="tabular shrink-0 text-[0.88rem] font-semibold text-tinta">{formatARS(it.subtotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="space-y-2 border-t border-aluminio p-5 text-[0.92rem]">
            <div className="flex justify-between">
              <dt className="text-tinta-2">Subtotal</dt>
              <dd className="tabular text-tinta">{formatARS(p.subtotal)}</dd>
            </div>
            {Number(p.descuento) > 0 && (
              <div className="flex justify-between text-verde">
                <dt>Descuento</dt>
                <dd className="tabular">−{formatARS(p.descuento)}</dd>
              </div>
            )}
            {p.entrega_metodo !== "retiro" && (
              <div className="flex justify-between">
                <dt className="text-tinta-2">Envío</dt>
                <dd className="tabular text-tinta">{p.costo_envio == null ? "A coordinar" : formatARS(p.costo_envio)}</dd>
              </div>
            )}
            <div className="flex items-baseline justify-between border-t border-aluminio pt-3">
              <dt className="font-bold text-tinta">Total</dt>
              <dd className="tabular text-2xl font-bold text-tinta">{formatARS(p.total)}</dd>
            </div>
          </dl>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Boton variante="claro" onClick={repetir} className="w-full">
            <RotateCcw className="size-4" /> Repetir pedido
          </Boton>
          <Boton variante="claro" onClick={compartir} className="w-full">
            <Share2 className="size-4" /> Guardar link
          </Boton>
        </div>
        <Boton asChild variante="wa" className="w-full">
          <a href={linkWhatsApp(tienda.whatsapp, `Hola! Consulto por mi pedido #${p.numero}`)} target="_blank" rel="noreferrer">
            <MessageCircle className="size-4" /> Consultar por WhatsApp
          </a>
        </Boton>
        <Link href="/mis-pedidos" className="block py-2 text-center text-sm font-medium text-tinta-2 hover:text-tinta">
          Ver todos mis pedidos
        </Link>
      </aside>
    </div>
  );
}
