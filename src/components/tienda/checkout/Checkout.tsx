"use client";

import { ArrowLeft, Banknote, Check, ChevronDown, CreditCard, Landmark, Lock, Store, Truck } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Isotipo } from "@/components/marca/Isotipo";
import { Boton } from "@/components/ui/Boton";
import { ImagenProducto } from "@/components/ui/ImagenProducto";
import { confirmarPedido } from "@/lib/actions/checkout";
import { subtotalDe, unidadesDe, useCarrito, useCarritoHidratado } from "@/lib/carrito";
import { formatARS, plural } from "@/lib/format";
import { guardarDatosComprador, leerDatosComprador, useMisPedidos, type DatosComprador } from "@/lib/locales";
import { esquemaPedido } from "@/lib/pedido-esquema";
import type { MetodoEntrega } from "@/lib/database.types";
import { cn } from "@/lib/utils";
import { useTienda } from "../ContextoTienda";
import { MedidorMinimo } from "../MedidorMinimo";

type MetodoPagoWeb = "mercadopago" | "transferencia" | "efectivo";

const VACIO: DatosComprador = {
  nombre: "",
  telefono: "",
  email: "",
  negocio: "",
  documento: "",
  entrega: "retiro",
  calle: "",
  ciudad: "",
  provincia: "Córdoba",
  cp: "",
  referencias: "",
};

function Campo({
  id,
  etiqueta,
  opcional,
  error,
  ayuda,
  children,
  className,
}: {
  id: string;
  etiqueta: string;
  opcional?: boolean;
  error?: string;
  ayuda?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between text-[0.88rem] font-medium text-tinta">
        {etiqueta}
        {opcional && <span className="text-[0.78rem] font-normal text-tinta-3">Opcional</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-[0.82rem] font-medium text-rojo" role="alert">
          {error}
        </p>
      ) : (
        ayuda && <p className="mt-1.5 text-[0.8rem] text-tinta-3">{ayuda}</p>
      )}
    </div>
  );
}

function Paso({ n, titulo, completo, children }: { n: number; titulo: string; completo: boolean; children: React.ReactNode }) {
  return (
    <section className="rounded-[1.25rem] border border-aluminio bg-white p-5 sm:p-6" aria-labelledby={`paso-${n}`}>
      <h2 id={`paso-${n}`} className="flex items-center gap-3 text-lg font-bold text-tinta">
        <span
          className={cn(
            "relative grid size-8 shrink-0 place-items-center rounded-lg text-sm font-extrabold transition-[background-color,color,box-shadow] duration-300",
            completo ? "cartel" : "bg-vidrio-2 text-tinta-3",
          )}
          aria-hidden="true"
        >
          {completo && <span className="cartel-luz" />}
          {completo ? <Check className="size-4" strokeWidth={3} /> : n}
        </span>
        {titulo}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Opcion({
  activa,
  deshabilitada,
  onElegir,
  icono,
  titulo,
  detalle,
  extra,
  nombre,
  valor,
}: {
  activa: boolean;
  deshabilitada?: boolean;
  onElegir: () => void;
  icono: React.ReactNode;
  titulo: string;
  detalle?: React.ReactNode;
  extra?: React.ReactNode;
  nombre: string;
  valor: string;
}) {
  return (
    <label
      className={cn(
        "relative flex cursor-pointer items-start gap-3.5 rounded-2xl border p-4 transition-[border-color,background-color,box-shadow] duration-150",
        activa ? "border-marca-500 bg-marca-50 shadow-[0_0_0_3px_rgb(92_99_170/0.14)]" : "border-aluminio-2 bg-white hover:border-tinta-3",
        deshabilitada && "cursor-not-allowed opacity-55 hover:border-aluminio-2",
      )}
    >
      <input
        type="radio"
        name={nombre}
        value={valor}
        checked={activa}
        disabled={deshabilitada}
        onChange={onElegir}
        className="peer sr-only"
      />
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white shadow-[0_0_0_1px_var(--color-aluminio)]">{icono}</span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2 font-semibold text-tinta">
          {titulo}
          {extra}
        </span>
        {detalle && <span className="mt-0.5 block text-[0.85rem] leading-snug text-tinta-2">{detalle}</span>}
      </span>
      <span
        className={cn(
          "mt-1 grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-marca-400",
          activa ? "border-marca-600 bg-marca-600" : "border-aluminio-2 bg-white",
        )}
        aria-hidden="true"
      >
        {activa && <span className="size-2 rounded-full bg-white" />}
      </span>
    </label>
  );
}

export function Checkout() {
  const tienda = useTienda();
  const hidratado = useCarritoHidratado();
  const items = useCarrito((s) => s.items);
  const vaciar = useCarrito((s) => s.vaciar);
  const guardarPedido = useMisPedidos((s) => s.guardar);
  const router = useRouter();
  const reducir = useReducedMotion();
  // Datos del pedido anterior (el formulario recién se muestra con el carrito hidratado: no hay desajuste con el servidor).
  const [previos] = useState(() => (typeof window === "undefined" ? null : leerDatosComprador()));
  const [d, setD] = useState<DatosComprador>(() => (previos?.nombre ? { ...VACIO, ...previos } : VACIO));
  const [recordado, setRecordado] = useState(Boolean(previos?.nombre));
  const [eleccion, setPago] = useState<MetodoPagoWeb | null>(null);
  const [notas, setNotas] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();
  const [redirigiendo, setRedirigiendo] = useState(false);
  const [resumenAbierto, setResumenAbierto] = useState(false);

  const mpDisponible = tienda.pago_mercadopago && tienda.mp_conectado;
  const envios = tienda.envios.filter((e) => e.activo);
  const opcionEnvio = envios.find((e) => e.id === d.entrega) ?? envios[0];

  // Medio de pago: lo que eligió la persona o el primero disponible; efectivo solo con retiro.
  const porDefecto: MetodoPagoWeb | null = mpDisponible
    ? "mercadopago"
    : tienda.pago_transferencia
      ? "transferencia"
      : tienda.pago_efectivo
        ? "efectivo"
        : null;
  let pago = eleccion ?? porDefecto;
  if (pago === "efectivo" && d.entrega !== "retiro") pago = mpDisponible ? "mercadopago" : tienda.pago_transferencia ? "transferencia" : null;

  const subtotal = subtotalDe(items);
  const unidades = unidadesDe(items);
  const falta = Math.max(0, tienda.compra_minima - subtotal);
  const descuento = pago === "transferencia" && tienda.descuento_transferencia > 0 ? Math.round((subtotal * tienda.descuento_transferencia) / 100) : 0;
  const envioPrecio =
    opcionEnvio?.precio == null
      ? null
      : opcionEnvio.gratis_desde != null && subtotal >= opcionEnvio.gratis_desde
        ? 0
        : opcionEnvio.precio;
  const total = subtotal - descuento + (envioPrecio ?? 0);

  const set = (k: keyof DatosComprador) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setD((x) => ({ ...x, [k]: e.target.value }));
    if (errores[k]) setErrores((x) => ({ ...x, [k]: "" }));
  };

  const datosOk = d.nombre.trim().length >= 2 && d.telefono.replace(/\D/g, "").length >= 8;
  const entregaOk = d.entrega === "retiro" || (d.calle.trim().length > 3 && d.ciudad.trim().length > 1);
  const pagoOk = pago !== null;

  const payload = useMemo(
    () => ({
      items: items.map((i) => ({ producto_id: i.id, cantidad: i.cantidad })),
      cliente: { nombre: d.nombre, telefono: d.telefono, email: d.email, negocio: d.negocio, documento: d.documento },
      entrega: {
        metodo: d.entrega as MetodoEntrega,
        direccion: d.entrega === "retiro" ? undefined : { calle: d.calle, ciudad: d.ciudad, provincia: d.provincia, cp: d.cp, referencias: d.referencias },
      },
      metodo_pago: pago,
      notas,
    }),
    [items, d, pago, notas],
  );

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErrorGeneral(null);
    const r = esquemaPedido.safeParse(payload);
    const errs: Record<string, string> = {};
    if (!r.success) {
      for (const i of r.error.issues) {
        const campo = i.path.join(".");
        const clave = campo.startsWith("cliente.") ? campo.slice(8) : campo === "metodo_pago" ? "pago" : campo;
        if (!errs[clave]) errs[clave] = i.message;
      }
    }
    if (d.entrega !== "retiro") {
      if (d.calle.trim().length <= 3) errs.calle = "Ingresá calle y número";
      if (d.ciudad.trim().length <= 1) errs.ciudad = "Ingresá la ciudad";
    }
    if (Object.keys(errs).length) {
      setErrores(errs);
      const primero = document.getElementById(`campo-${Object.keys(errs)[0]}`);
      primero?.focus();
      return;
    }

    iniciar(async () => {
      const res = await confirmarPedido(payload);
      if (!res.ok) {
        setErrorGeneral(res.error);
        toast.error(res.error);
        return;
      }
      const { token, numero, total: t, init_point, aviso } = res.data;
      guardarPedido({ token, numero, total: t, fecha: new Date().toISOString(), metodo: pago ?? "" });
      guardarDatosComprador(d);
      if (init_point) {
        setRedirigiendo(true);
        vaciar();
        window.location.assign(init_point);
        return;
      }
      vaciar();
      if (aviso) toast.warning(aviso);
      router.push(`/pedido/${token}?nuevo=1`);
    });
  }

  if (!hidratado) {
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-4">
          <div className="esqueleto h-64 w-full rounded-[1.25rem]" />
          <div className="esqueleto h-48 w-full rounded-[1.25rem]" />
        </div>
        <div className="esqueleto h-96 w-full rounded-[1.25rem]" />
      </div>
    );
  }

  if (items.length === 0 && !redirigiendo && !enviando) {
    return (
      <div className="vidriera mx-auto flex max-w-xl flex-col items-center px-6 py-16 text-center">
        <Isotipo className="size-16 text-aluminio" grosor={6} />
        <h1 className="mt-5 text-xl font-bold text-tinta">Tu pedido está vacío</h1>
        <p className="mt-2 text-tinta-2">Sumá productos hasta llegar a la compra mínima y volvé para confirmarlo.</p>
        <div className="mt-6 flex gap-2">
          <Boton asChild>
            <Link href="/ofertas">Ver ofertas</Link>
          </Boton>
          <Boton asChild variante="claro">
            <Link href="/catalogo">Ir al catálogo</Link>
          </Boton>
        </div>
      </div>
    );
  }

  const resumen = (
    <div className="rounded-[1.25rem] border border-aluminio bg-white">
      <button
        type="button"
        onClick={() => setResumenAbierto((v) => !v)}
        className="flex w-full items-center justify-between gap-3 p-5 text-left lg:pointer-events-none"
        aria-expanded={resumenAbierto}
      >
        <span>
          <span className="block text-base font-bold text-tinta">Tu pedido</span>
          <span className="tabular block text-sm text-tinta-3">
            {plural(items.length, "producto", "productos")} · {plural(unidades, "unidad", "unidades")}
          </span>
        </span>
        <span className="flex items-center gap-2">
          <span className="tabular text-lg font-bold text-tinta lg:hidden">{formatARS(total)}</span>
          <ChevronDown className={cn("size-5 text-tinta-3 transition-transform duration-200 lg:hidden", resumenAbierto && "rotate-180")} />
        </span>
      </button>
      <div className={cn("border-t border-aluminio px-5", resumenAbierto ? "block" : "hidden lg:block")}>
        <ul className="max-h-[42vh] divide-y divide-aluminio overflow-y-auto">
          {items.map((i) => (
            <li key={i.id} className="flex items-center gap-3 py-3">
              <span className="relative shrink-0">
                <ImagenProducto ruta={i.imagen} alt="" className="size-12 rounded-lg border border-aluminio" />
                <span className="tabular absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-marca-700 px-1 text-[0.68rem] font-bold text-white">
                  {i.cantidad}
                </span>
              </span>
              <span className="line-clamp-2 min-w-0 flex-1 text-[0.85rem] leading-snug text-tinta">{i.nombre}</span>
              <span className="tabular shrink-0 text-[0.88rem] font-semibold text-tinta">{formatARS(i.precio * i.cantidad)}</span>
            </li>
          ))}
        </ul>
      </div>
      <dl className="space-y-2 border-t border-aluminio p-5 text-[0.92rem]">
        <div className="flex justify-between">
          <dt className="text-tinta-2">Subtotal</dt>
          <dd className="tabular font-medium text-tinta">{formatARS(subtotal)}</dd>
        </div>
        {descuento > 0 && (
          <div className="flex justify-between text-verde">
            <dt>Descuento por transferencia ({tienda.descuento_transferencia}%)</dt>
            <dd className="tabular font-medium">−{formatARS(descuento)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-tinta-2">{opcionEnvio?.id === "retiro" ? "Retiro en el local" : "Envío"}</dt>
          <dd className="tabular font-medium text-tinta">
            {envioPrecio == null ? "A coordinar" : envioPrecio === 0 ? "Sin cargo" : formatARS(envioPrecio)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between border-t border-aluminio pt-3">
          <dt className="font-bold text-tinta">Total</dt>
          <dd className="tabular text-2xl font-bold text-tinta">{formatARS(total)}</dd>
        </div>
      </dl>
    </div>
  );

  return (
    <form onSubmit={enviar} noValidate className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-6">
      <div className="space-y-4">
        {falta > 0 && (
          <div className="rounded-[1.25rem] border border-ambar-2/60 bg-[#fff6d6] p-4">
            <MedidorMinimo subtotal={subtotal} minimo={tienda.compra_minima} />
            <p className="mt-3 text-[0.9rem] text-ambar-tinta">
              Para confirmar el pedido necesitás llegar a la compra mínima.{" "}
              <Link href="/ofertas" className="font-semibold underline">
                Sumá algo de las ofertas
              </Link>
              .
            </p>
          </div>
        )}

        {errorGeneral && (
          <div className="rounded-2xl border border-rojo/40 bg-[#fdecec] p-4 text-[0.92rem] font-medium text-rojo" role="alert">
            {errorGeneral}
          </div>
        )}

        <Paso n={1} titulo="Tus datos" completo={datosOk}>
          {recordado && (
            <p className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-vidrio px-3.5 py-2.5 text-[0.85rem] text-tinta-2">
              Completamos con tus datos del último pedido.
              <button
                type="button"
                onClick={() => {
                  setD(VACIO);
                  setRecordado(false);
                  guardarDatosComprador({});
                }}
                className="font-semibold text-marca-700 hover:underline"
              >
                No soy yo
              </button>
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo id="campo-nombre" etiqueta="Nombre y apellido" error={errores.nombre} className="sm:col-span-2">
              <input
                id="campo-nombre"
                className="campo"
                value={d.nombre}
                onChange={set("nombre")}
                autoComplete="name"
                aria-invalid={Boolean(errores.nombre)}
                aria-describedby={errores.nombre ? "campo-nombre-error" : undefined}
              />
            </Campo>
            <Campo id="campo-telefono" etiqueta="WhatsApp o teléfono" error={errores.telefono} ayuda="Con código de área. Te escribimos por acá si hace falta.">
              <input
                id="campo-telefono"
                className="campo tabular"
                value={d.telefono}
                onChange={set("telefono")}
                inputMode="tel"
                autoComplete="tel"
                placeholder="351 123-4567"
                aria-invalid={Boolean(errores.telefono)}
              />
            </Campo>
            <Campo id="campo-email" etiqueta="Email" opcional error={errores.email} ayuda="Para el comprobante de pago.">
              <input
                id="campo-email"
                type="email"
                className="campo"
                value={d.email}
                onChange={set("email")}
                autoComplete="email"
                inputMode="email"
                aria-invalid={Boolean(errores.email)}
              />
            </Campo>
            <Campo id="campo-negocio" etiqueta="Nombre del comercio" opcional>
              <input id="campo-negocio" className="campo" value={d.negocio} onChange={set("negocio")} autoComplete="organization" />
            </Campo>
            <Campo id="campo-documento" etiqueta="CUIT o DNI" opcional ayuda="Si necesitás factura.">
              <input id="campo-documento" className="campo tabular" value={d.documento} onChange={set("documento")} inputMode="numeric" />
            </Campo>
          </div>
        </Paso>

        <Paso n={2} titulo="Entrega" completo={datosOk && entregaOk}>
          <div className="grid gap-2.5">
            {envios.map((e) => (
              <Opcion
                key={e.id}
                nombre="entrega"
                valor={e.id}
                activa={d.entrega === e.id}
                onElegir={() => setD((x) => ({ ...x, entrega: e.id }))}
                icono={e.id === "retiro" ? <Store className="size-5 text-marca-600" /> : <Truck className="size-5 text-marca-600" />}
                titulo={e.nombre}
                detalle={e.detalle}
                extra={
                  <span className="tabular text-[0.82rem] font-semibold text-tinta-2">
                    {e.precio == null ? "· a coordinar" : e.precio === 0 ? "· sin cargo" : `· ${formatARS(e.precio)}`}
                  </span>
                }
              />
            ))}
          </div>
          <AnimatePresence initial={false}>
            {d.entrega !== "retiro" && (
              <motion.div
                initial={reducir ? { opacity: 0 } : { opacity: 0, height: 0 }}
                animate={reducir ? { opacity: 1 } : { opacity: 1, height: "auto" }}
                exit={reducir ? { opacity: 0 } : { opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                className="overflow-hidden"
              >
                <div className="grid gap-4 pt-5 sm:grid-cols-2">
                  <Campo id="campo-calle" etiqueta="Calle y número" error={errores.calle} className="sm:col-span-2">
                    <input id="campo-calle" className="campo" value={d.calle} onChange={set("calle")} autoComplete="street-address" aria-invalid={Boolean(errores.calle)} />
                  </Campo>
                  <Campo id="campo-ciudad" etiqueta="Ciudad" error={errores.ciudad}>
                    <input id="campo-ciudad" className="campo" value={d.ciudad} onChange={set("ciudad")} autoComplete="address-level2" aria-invalid={Boolean(errores.ciudad)} />
                  </Campo>
                  <Campo id="campo-provincia" etiqueta="Provincia">
                    <input id="campo-provincia" className="campo" value={d.provincia} onChange={set("provincia")} autoComplete="address-level1" />
                  </Campo>
                  <Campo id="campo-cp" etiqueta="Código postal" opcional>
                    <input id="campo-cp" className="campo tabular" value={d.cp} onChange={set("cp")} inputMode="numeric" autoComplete="postal-code" />
                  </Campo>
                  <Campo id="campo-referencias" etiqueta="Referencias" opcional>
                    <input id="campo-referencias" className="campo" value={d.referencias} onChange={set("referencias")} placeholder="Entre calles, horario, transporte…" />
                  </Campo>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Paso>

        <Paso n={3} titulo="Pago" completo={datosOk && entregaOk && pagoOk}>
          <div className="grid gap-2.5" id="campo-pago" tabIndex={-1}>
            {mpDisponible && (
              <Opcion
                nombre="pago"
                valor="mercadopago"
                activa={pago === "mercadopago"}
                onElegir={() => setPago("mercadopago")}
                icono={<CreditCard className="size-5 text-[#009ee3]" />}
                titulo="Mercado Pago"
                detalle="Tarjetas de crédito y débito, dinero en cuenta o efectivo en puntos de pago. Pagás en el sitio seguro de Mercado Pago."
              />
            )}
            {tienda.pago_transferencia && (
              <Opcion
                nombre="pago"
                valor="transferencia"
                activa={pago === "transferencia"}
                onElegir={() => setPago("transferencia")}
                icono={<Landmark className="size-5 text-marca-600" />}
                titulo="Transferencia bancaria"
                extra={tienda.descuento_transferencia > 0 && <span className="vinilo vinilo-ambar">{tienda.descuento_transferencia}% off</span>}
                detalle="Al confirmar te mostramos los datos para transferir y nos mandás el comprobante por WhatsApp."
              />
            )}
            {tienda.pago_efectivo && (
              <Opcion
                nombre="pago"
                valor="efectivo"
                activa={pago === "efectivo"}
                deshabilitada={d.entrega !== "retiro"}
                onElegir={() => setPago("efectivo")}
                icono={<Banknote className="size-5 text-verde" />}
                titulo="Efectivo al retirar"
                detalle={d.entrega === "retiro" ? `Pagás en el local, ${tienda.direccion}.` : "Disponible solo retirando en el local."}
              />
            )}
            {!mpDisponible && !tienda.pago_transferencia && !tienda.pago_efectivo && (
              <p className="rounded-xl bg-vidrio p-4 text-[0.92rem] text-tinta-2">
                En este momento no hay medios de pago online habilitados. Confirmá el pedido por WhatsApp.
              </p>
            )}
            {errores.pago && <p className="text-[0.82rem] font-medium text-rojo">{errores.pago}</p>}
          </div>

          <div className="mt-5">
            <label htmlFor="campo-notas" className="mb-1.5 flex items-baseline justify-between text-[0.88rem] font-medium text-tinta">
              Notas para el local
              <span className="text-[0.78rem] font-normal text-tinta-3">Opcional</span>
            </label>
            <textarea
              id="campo-notas"
              className="campo"
              rows={3}
              maxLength={1000}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej.: paso a retirar el jueves a la tarde, colores surtidos, etc."
            />
          </div>
        </Paso>
      </div>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="space-y-3">
          {resumen}
          <Boton tam="lg" type="submit" className="w-full" cargando={enviando || redirigiendo} disabled={falta > 0 || !pago}>
            {falta > 0 ? (
              <>Te faltan {formatARS(falta)}</>
            ) : pago === "mercadopago" ? (
              <>
                <Lock className="size-4" /> Pagar con Mercado Pago · {formatARS(total)}
              </>
            ) : (
              <>Confirmar pedido · {formatARS(total)}</>
            )}
          </Boton>
          <p className="px-2 text-center text-[0.8rem] leading-relaxed text-tinta-3">
            {pago === "mercadopago"
              ? "Te llevamos al sitio seguro de Mercado Pago. Al volver vas a ver el estado de tu pedido."
              : "Vas a poder seguir el estado de tu pedido desde el link que te damos al confirmar."}
          </p>
          <Link href="/" className="flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-tinta-2 hover:text-tinta">
            <ArrowLeft className="size-4" /> Seguir comprando
          </Link>
        </div>
      </div>

      <AnimatePresence>
        {redirigiendo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[80] grid place-items-center bg-white/92 backdrop-blur-sm"
            role="status"
          >
            <div className="flex flex-col items-center text-center">
              <span className="size-10 animate-spin rounded-full border-[3px] border-marca-500 border-r-transparent [animation-duration:700ms]" />
              <p className="mt-5 text-lg font-semibold text-tinta">Te llevamos a Mercado Pago…</p>
              <p className="mt-1 text-sm text-tinta-3">Tu pedido ya quedó registrado.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
