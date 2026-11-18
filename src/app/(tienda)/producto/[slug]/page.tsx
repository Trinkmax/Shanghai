import { Banknote, Landmark, MapPin, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FilaVidriera } from "@/components/tienda/GrillaVidriera";
import { Migas } from "@/components/tienda/PaginaListado";
import { Comprar } from "@/components/tienda/producto/Comprar";
import { Galeria } from "@/components/tienda/producto/Galeria";
import { Vinilos } from "@/components/tienda/TarjetaProducto";
import { Contenedor, TituloSeccion } from "@/components/tienda/TituloSeccion";
import { FichaRubro } from "@/components/ui/IconoRubro";
import { obtenerConfig, obtenerProducto, obtenerRelacionados, obtenerSlugsPopulares } from "@/lib/datos/catalogo";
import { formatARS } from "@/lib/format";
import { urlImagen } from "@/lib/imagenes";
import { SITIO } from "@/lib/sitio";

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const slugs = await obtenerSlugsPopulares();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const p = await obtenerProducto(slug);
  if (!p) return { title: "Producto no encontrado" };
  const img = urlImagen(p.imagenes[0], "lg");
  return {
    title: p.nombre,
    description: `${p.nombre} (Cód. ${p.codigo}) a ${formatARS(p.precio_final)} por unidad, precio mayorista en Shangai Center, Córdoba.`,
    openGraph: { title: p.nombre, images: img ? [{ url: img, width: 1000, height: 1000 }] : undefined },
    alternates: { canonical: `/producto/${p.slug}` },
  };
}

function EsqueletoProducto() {
  return (
    <Contenedor className="pt-6">
      <div className="esqueleto h-4 w-56" />
      <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="esqueleto aspect-square w-full rounded-[1.25rem]" />
        <div>
          <div className="esqueleto h-10 w-4/5" />
          <div className="esqueleto mt-3 h-10 w-2/5" />
          <div className="esqueleto mt-8 h-14 w-3/5" />
          <div className="esqueleto mt-6 h-48 w-full rounded-[1.25rem]" />
        </div>
      </div>
    </Contenedor>
  );
}

async function Ficha({ params }: { params: Params }) {
  const { slug } = await params;
  const [p, config] = await Promise.all([obtenerProducto(slug), obtenerConfig()]);
  if (!p) notFound();
  const relacionados = await obtenerRelacionados({ id: p.id, categoria_id: p.categoria_id });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.nombre,
    sku: p.codigo,
    image: p.imagenes.map((i) => urlImagen(i, "lg")),
    brand: { "@type": "Brand", name: config.nombre_tienda },
    category: p.categoria?.nombre,
    offers: {
      "@type": "Offer",
      priceCurrency: "ARS",
      price: p.precio_final,
      availability: p.agotado ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      url: `${SITIO}/producto/${p.slug}`,
      seller: { "@type": "Organization", name: config.nombre_tienda },
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Contenedor className="pt-4 sm:pt-6">
        <Migas
          migas={[
            { texto: "Inicio", href: "/" },
            ...(p.categoria ? [{ texto: p.categoria.nombre, href: `/rubro/${p.categoria.slug}` }] : [{ texto: "Catálogo", href: "/catalogo" }]),
            { texto: p.nombre },
          ]}
        />
        <div className="mt-4 grid gap-6 lg:mt-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-10">
          <Galeria imagenes={p.imagenes} nombre={p.nombre}>
            <Vinilos p={p} className="absolute left-3 top-3 sm:left-4 sm:top-4" />
          </Galeria>

          <div className="lg:sticky lg:top-24 lg:self-start">
            {p.categoria && (
              <Link
                href={`/rubro/${p.categoria.slug}`}
                className="inline-flex items-center gap-2 rounded-xl py-1 pr-2 text-[0.88rem] font-medium text-tinta-2 hover:text-marca-700"
              >
                <FichaRubro icono={p.categoria.icono} color={p.categoria.color} tam="sm" className="size-7 rounded-lg [&_svg]:size-3.5" />
                {p.categoria.nombre}
              </Link>
            )}
            <h1 className="mt-3 text-[clamp(1.5rem,3.2vw,2.25rem)] font-bold leading-[1.15] tracking-[-0.015em] text-tinta">{p.nombre}</h1>

            <div className="mt-5">
              <Comprar p={p} />
            </div>

            <ul className="mt-6 grid gap-2 text-[0.9rem] text-tinta-2 sm:grid-cols-2">
              <li className="flex items-start gap-2.5 rounded-xl border border-aluminio bg-white p-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-marca-500" />
                <span>
                  Retirás en <span className="font-semibold text-tinta">{config.direccion}</span>
                </span>
              </li>
              {config.envios.some((e) => e.id !== "retiro" && e.activo) && (
                <li className="flex items-start gap-2.5 rounded-xl border border-aluminio bg-white p-3">
                  <Truck className="mt-0.5 size-4 shrink-0 text-marca-500" />
                  <span>Envíos a Córdoba y el interior, a coordinar</span>
                </li>
              )}
              {config.pago_transferencia && (
                <li className="flex items-start gap-2.5 rounded-xl border border-aluminio bg-white p-3">
                  <Landmark className="mt-0.5 size-4 shrink-0 text-marca-500" />
                  <span>
                    Transferencia
                    {config.descuento_transferencia > 0 && (
                      <span className="font-semibold text-tinta"> con {config.descuento_transferencia}% off</span>
                    )}
                  </span>
                </li>
              )}
              {config.pago_efectivo && (
                <li className="flex items-start gap-2.5 rounded-xl border border-aluminio bg-white p-3">
                  <Banknote className="mt-0.5 size-4 shrink-0 text-marca-500" />
                  <span>Efectivo al retirar en el local</span>
                </li>
              )}
            </ul>

            {p.descripcion && (
              <section className="mt-8" aria-labelledby="titulo-descripcion">
                <h2 id="titulo-descripcion" className="text-base font-bold text-tinta">
                  Descripción
                </h2>
                <p className="mt-2 whitespace-pre-line text-[0.95rem] leading-relaxed text-tinta-2">{p.descripcion}</p>
              </section>
            )}
          </div>
        </div>
      </Contenedor>

      {relacionados.length > 0 && p.categoria && (
        <Contenedor className="mt-16 sm:mt-20">
          <TituloSeccion titulo={`Más de ${p.categoria.nombre}`} href={`/rubro/${p.categoria.slug}`} accion="Ver el rubro" />
          <FilaVidriera productos={relacionados.slice(0, 12)} />
        </Contenedor>
      )}
    </>
  );
}

export default function PaginaProducto({ params }: { params: Params }) {
  return (
    <Suspense fallback={<EsqueletoProducto />}>
      <Ficha params={params} />
    </Suspense>
  );
}
