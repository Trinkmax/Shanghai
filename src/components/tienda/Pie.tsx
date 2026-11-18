import { MapPin, MessageCircle, Store } from "lucide-react";
import { IconoInstagram as Instagram } from "@/components/marca/IconoInstagram";
import Link from "next/link";
import { Logotipo } from "@/components/marca/Isotipo";
import { formatARS, formatTelefono, linkWhatsApp } from "@/lib/format";
import { DIAS_CORTOS, type ConfigTienda } from "@/lib/tienda";

function Horarios({ horarios }: { horarios: ConfigTienda["horarios"] }) {
  if (!horarios.length) return <p className="text-marca-200">Consultá horarios por WhatsApp.</p>;
  const porDia = new Map<number, string[]>();
  for (const h of horarios) porDia.set(h.dia, [...(porDia.get(h.dia) ?? []), `${h.abre}–${h.cierra}`]);
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
      {[1, 2, 3, 4, 5, 6, 0].map((d) => (
        <div key={d} className="contents">
          <dt className="text-marca-200">{DIAS_CORTOS[d]}</dt>
          <dd className="tabular">{porDia.get(d)?.join(" · ") ?? "Cerrado"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Pie({ config }: { config: ConfigTienda }) {
  const mapa = config.mapa_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${config.direccion}, ${config.ciudad}, Argentina`)}`;
  return (
    <footer className="mt-20 px-2 pb-24 sm:px-3 lg:pb-3">
      <div className="cartel mx-auto max-w-[1440px] overflow-hidden rounded-[1.75rem] px-6 py-10 sm:px-10 sm:py-14">
        <span className="cartel-luz" />
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <div>
            <Logotipo conBajada className="[&_svg]:size-10" />
            <p className="mt-5 max-w-[34ch] text-[0.95rem] text-marca-100">
              Importados para tu negocio, a precio mayorista. Compra mínima{" "}
              <span className="tabular font-semibold text-white">{formatARS(config.compra_minima)}</span>.
            </p>
          </div>

          <div className="text-[0.92rem]">
            <h2 className="rotulo-medio mb-4 text-[0.72rem] text-marca-200">El local</h2>
            <a href={mapa} target="_blank" rel="noreferrer" className="group flex items-start gap-2.5 hover:text-white">
              <MapPin className="mt-0.5 size-4 shrink-0 text-marca-200" />
              <span>
                <span className="font-semibold text-white group-hover:underline">{config.direccion}</span>
                <br />
                <span className="text-marca-100">{config.ciudad}</span>
              </span>
            </a>
            <div className="mt-4 text-marca-50">
              <Horarios horarios={config.horarios} />
            </div>
          </div>

          <div className="text-[0.92rem]">
            <h2 className="rotulo-medio mb-4 text-[0.72rem] text-marca-200">Hablemos</h2>
            <ul className="space-y-3">
              <li>
                <a href={linkWhatsApp(config.whatsapp, "Hola! Quiero hacer un pedido en Shangai Center")} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 hover:underline">
                  <MessageCircle className="size-4 text-marca-200" />
                  <span className="tabular">WhatsApp {formatTelefono(config.whatsapp)}</span>
                </a>
              </li>
              {config.instagram && (
                <li>
                  <a href={`https://instagram.com/${config.instagram}`} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 hover:underline">
                    <Instagram className="size-4 text-marca-200" />@{config.instagram}
                  </a>
                </li>
              )}
              {config.email && (
                <li>
                  <a href={`mailto:${config.email}`} className="hover:underline">
                    {config.email}
                  </a>
                </li>
              )}
            </ul>
          </div>

          <div className="text-[0.92rem]">
            <h2 className="rotulo-medio mb-4 text-[0.72rem] text-marca-200">Comprar</h2>
            <ul className="space-y-2.5 text-marca-50">
              <li><Link href="/catalogo" className="hover:text-white hover:underline">Catálogo completo</Link></li>
              <li><Link href="/ofertas" className="hover:text-white hover:underline">Ofertas</Link></li>
              <li><Link href="/mas-vendidos" className="hover:text-white hover:underline">Más vendidos</Link></li>
              <li><Link href="/novedades" className="hover:text-white hover:underline">Novedades</Link></li>
              <li><Link href="/mis-pedidos" className="hover:text-white hover:underline">Mis pedidos</Link></li>
              <li><Link href="/favoritos" className="hover:text-white hover:underline">Favoritos</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/12 pt-6 text-[0.8rem] text-marca-200 sm:flex-row sm:items-center sm:justify-between">
          <p>© {config.nombre_tienda} · Precios en pesos argentinos, sujetos a cambio sin previo aviso.</p>
          <Link href="/panel" className="inline-flex items-center gap-1.5 hover:text-white">
            <Store className="size-3.5" /> Acceso del equipo
          </Link>
        </div>
      </div>
    </footer>
  );
}
