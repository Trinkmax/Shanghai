import { MapPin, MessageCircle, Navigation } from "lucide-react";
import Link from "next/link";
import { Isotipo } from "@/components/marca/Isotipo";
import { FichaRubro } from "@/components/ui/IconoRubro";
import { formatARS, formatNumero, formatTelefono, linkWhatsApp } from "@/lib/format";
import { DIAS_CORTOS, type Categoria, type ConfigTienda } from "@/lib/tienda";
import { Contenedor, TituloSeccion } from "../TituloSeccion";

/** Medios de pago y entrega reales de la configuración, como texto simple. */
export function Puerta({ config }: { config: ConfigTienda }) {
  const datos: { texto: string; detalle: string }[] = [];
  if (config.mp_conectado && config.pago_mercadopago) datos.push({ texto: "Mercado Pago", detalle: "Tarjetas, débito y dinero en cuenta" });
  if (config.pago_transferencia)
    datos.push({
      texto: "Transferencia",
      detalle: config.descuento_transferencia > 0 ? `${config.descuento_transferencia}% de descuento` : "Bancaria o billetera virtual",
    });
  if (config.pago_efectivo) datos.push({ texto: "Efectivo", detalle: "Pagás al retirar" });
  datos.push({ texto: "Retiro en el local", detalle: config.direccion });
  if (config.envios.some((e) => e.id !== "retiro" && e.activo)) datos.push({ texto: "Envíos", detalle: "Córdoba y el interior, a coordinar" });

  return (
    <Contenedor className="mt-6 sm:mt-8">
      <ul className="grid grid-cols-2 gap-x-6 gap-y-4 sm:flex sm:flex-wrap sm:justify-center sm:gap-x-10" aria-label="Medios de pago y entrega">
        {datos.map((d) => (
          <li key={d.texto} className="leading-tight">
            <span className="block text-[0.92rem] font-semibold text-tinta">{d.texto}</span>
            <span className="mt-0.5 block text-[0.8rem] text-tinta-3">{d.detalle}</span>
          </li>
        ))}
      </ul>
    </Contenedor>
  );
}

export function GrillaRubros({ categorias }: { categorias: Categoria[] }) {
  const visibles = categorias.slice(0, 18);
  const total = categorias.reduce((t, c) => t + c.cantidad, 0);
  return (
    <Contenedor className="mt-16 sm:mt-24">
      <TituloSeccion
        titulo="Rubros"
        bajada={`${formatNumero(total)} productos ordenados como en el local: entrá directo a lo que vendés.`}
        href="/catalogo"
        accion={`Ver los ${categorias.length}`}
        id="titulo-rubros"
      />
      <ul className="grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-3 lg:grid-cols-6 lg:gap-y-9" aria-labelledby="titulo-rubros">
        {visibles.map((c) => (
          <li key={c.id} className="max-sm:[&:nth-child(n+9)]:hidden">
            <Link href={`/rubro/${c.slug}`} className="group flex items-start gap-3">
              <FichaRubro icono={c.icono} tam="md" className="transition-transform duration-300 ease-out motion-safe:group-hover:-translate-y-0.5" />
              <span className="min-w-0 pt-0.5">
                <span className="line-clamp-2 hyphens-auto break-words text-[0.95rem] font-semibold leading-tight text-tinta decoration-marca-300 underline-offset-[0.25em] group-hover:text-marca-700 group-hover:underline">
                  {c.nombre}
                </span>
                <span className="tabular mt-0.5 block text-[0.75rem] text-tinta-3">{formatNumero(c.cantidad)} productos</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Contenedor>
  );
}

export function ComoComprar({ config }: { config: ConfigTienda }) {
  const pasos = [
    { t: "Armá tu pedido", d: "Buscá por nombre o código y sumá las cantidades que necesitás." },
    { t: "Completá la caja", d: `Con ${formatARS(config.compra_minima)} o más, el pedido queda listo para confirmar.` },
    {
      t: config.mp_conectado ? "Pagá y retirá" : "Confirmá y retirá",
      d: config.mp_conectado
        ? `Mercado Pago, transferencia o efectivo. Retirás en ${config.direccion} o coordinamos el envío.`
        : `Te confirmamos por WhatsApp. Retirás en ${config.direccion} o coordinamos el envío.`,
    },
  ];
  return (
    <Contenedor className="mt-16 sm:mt-24">
      <div className="vidriera grid md:grid-cols-3">
        {pasos.map((p, i) => (
          <div key={p.t} className="relative border-aluminio p-6 sm:p-8 [&:not(:last-child)]:border-b md:[&:not(:last-child)]:border-b-0 md:[&:not(:last-child)]:border-r">
            <span className="cartel inline-grid size-11 place-items-center rounded-xl text-lg font-extrabold">
              <span className="cartel-luz" />
              {i + 1}
            </span>
            <h3 className="mt-5 text-lg font-bold text-tinta">{p.t}</h3>
            <p className="mt-1.5 text-[0.95rem] leading-relaxed text-tinta-2">{p.d}</p>
          </div>
        ))}
      </div>
    </Contenedor>
  );
}

export function ElLocal({ config }: { config: ConfigTienda }) {
  const mapa =
    config.mapa_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${config.direccion}, ${config.ciudad}, Argentina`)}`;
  return (
    <Contenedor className="mt-16 sm:mt-24">
      <div className="vidriera grid lg:grid-cols-[1.25fr_1fr]">
        <div className="relative overflow-hidden p-7 sm:p-12">
          <Isotipo className="pointer-events-none absolute -right-10 -top-10 size-64 text-marca-50" grosor={7} />
          <h2 className="rotulo relative text-[clamp(2.2rem,6vw,4rem)] text-marca-700">{config.direccion}</h2>
          <p className="relative mt-3 flex items-center gap-2 text-lg text-tinta-2">
            <MapPin className="size-5 text-marca-500" /> {config.ciudad} · te esperamos en el local
          </p>
          <div className="relative mt-8 flex flex-wrap gap-2.5">
            <a
              href={mapa}
              target="_blank"
              rel="noreferrer"
              className="cartel presionable inline-flex h-12 items-center gap-2 rounded-xl px-5 font-semibold"
            >
              <Navigation className="size-4" /> Cómo llegar
            </a>
            <a
              href={linkWhatsApp(config.whatsapp, "Hola! Tengo una consulta")}
              target="_blank"
              rel="noreferrer"
              className="presionable inline-flex h-12 items-center gap-2 rounded-xl border border-aluminio-2 bg-white px-5 font-semibold text-tinta hover:border-tinta-3"
            >
              <MessageCircle className="size-4 text-verde" />
              <span className="tabular">{formatTelefono(config.whatsapp)}</span>
            </a>
          </div>
        </div>
        <div className="border-t border-aluminio bg-vidrio p-7 sm:p-12 lg:border-l lg:border-t-0">
          <h3 className="text-base font-bold text-tinta">Horarios</h3>
          {config.horarios.length ? (
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[0.95rem]">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                const del = config.horarios.filter((h) => h.dia === d);
                return (
                  <div key={d} className="contents">
                    <dt className="text-tinta-3">{DIAS_CORTOS[d]}</dt>
                    <dd className="tabular text-tinta">{del.length ? del.map((h) => `${h.abre} a ${h.cierra}`).join(" · ") : "Cerrado"}</dd>
                  </div>
                );
              })}
            </dl>
          ) : (
            <p className="mt-3 text-[0.95rem] text-tinta-2">Escribinos por WhatsApp y coordinamos tu visita o el retiro de tu pedido.</p>
          )}
          <h3 className="mt-8 text-base font-bold text-tinta">Venta mayorista</h3>
          <p className="mt-2 text-[0.95rem] text-tinta-2">
            Compra mínima de <span className="tabular font-semibold text-tinta">{formatARS(config.compra_minima)}</span> por pedido.
          </p>
        </div>
      </div>
    </Contenedor>
  );
}
