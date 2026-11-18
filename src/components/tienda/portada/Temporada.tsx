import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { ImagenProducto } from "@/components/ui/ImagenProducto";
import type { Tabla } from "@/lib/database.types";
import { cn } from "@/lib/utils";
import { Contenedor } from "../TituloSeccion";

type Banner = Tabla<"banners"> & { fotos: string[] };

const TONOS: Record<string, { caja: string; titulo: string; texto: string; boton: string }> = {
  indigo: { caja: "cartel", titulo: "text-white", texto: "text-marca-100", boton: "bg-white text-marca-800" },
  noche: {
    caja: "bg-[radial-gradient(120%_90%_at_20%_0%,#2c2470_0%,#16113d_55%,#0d0a26_100%)] text-white shadow-[0_18px_40px_-18px_rgb(13_10_38/0.9)]",
    titulo: "text-white",
    texto: "text-marca-200",
    boton: "bg-ambar text-ambar-tinta",
  },
  ambar: {
    caja: "bg-[linear-gradient(160deg,#ffd75a_0%,#ffc21a_45%,#f5ad00_100%)] text-ambar-tinta shadow-[0_18px_40px_-18px_rgb(242_174_0/0.9)]",
    titulo: "text-ambar-tinta",
    texto: "text-ambar-tinta/80",
    boton: "bg-ambar-tinta text-ambar",
  },
  claro: { caja: "border border-aluminio bg-white", titulo: "text-marca-700", texto: "text-tinta-2", boton: "cartel" },
};

/** Guirnalda de luces para el cartel nocturno (titila suave; quieta con movimiento reducido). */
function Guirnalda() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-x-6 top-0 flex justify-between">
      {Array.from({ length: 14 }).map((_, i) => (
        <span
          key={i}
          className="mt-[7px] size-1.5 rounded-full bg-ambar shadow-[0_0_10px_3px_rgb(255_194_26/0.55)] motion-safe:animate-[var(--animate-respirar)]"
          style={{ animationDelay: `${(i % 5) * 0.45}s`, transform: `translateY(${Math.sin(i * 0.9) * 4 + 4}px)` }}
        />
      ))}
    </span>
  );
}

export function Temporada({ banners }: { banners: Banner[] }) {
  if (banners.length === 0) return null;
  return (
    <Contenedor className="mt-16 sm:mt-24">
      <div className={cn("grid gap-3", banners.length >= 3 ? "md:grid-cols-3" : banners.length === 2 ? "md:grid-cols-2" : "")}>
        {banners.map((b, i) => {
          const t = TONOS[b.tono] ?? TONOS.indigo;
          const contenido = (
            <>
              {b.tono === "indigo" && <span className="cartel-luz" />}
              {b.tono === "noche" && <Guirnalda />}
              <div className="relative z-[1] max-w-[22ch]">
                <h2 className={cn("rotulo text-[clamp(1.6rem,3.2vw,2.3rem)]", t.titulo)}>{b.titulo}</h2>
                {b.bajada && <p className={cn("mt-3 text-[0.95rem] leading-relaxed", t.texto)}>{b.bajada}</p>}
              </div>
              {b.cta_texto && (
                <span className={cn("relative z-[1] mt-6 inline-flex h-11 w-fit items-center gap-2 rounded-xl px-4 text-sm font-semibold", t.boton)}>
                  {b.cta_texto}
                  <ArrowRight className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
                </span>
              )}
              {b.fotos.length > 0 && (
                <span aria-hidden="true" className="pointer-events-none absolute -bottom-4 -right-3 flex">
                  {b.fotos.slice(0, 3).map((f, k) => (
                    <span
                      key={f}
                      className="-ml-8 block size-[6.5rem] overflow-hidden rounded-2xl bg-white p-1.5 shadow-[0_12px_28px_-10px_rgb(0_0_0/0.45)] transition-transform duration-500 ease-out sm:size-28"
                      style={{ transform: `rotate(${[-8, 4, 10][k]}deg) translateY(${[10, 0, 14][k]}px)` }}
                    >
                      <ImagenProducto ruta={f} alt="" className="size-full rounded-xl" />
                    </span>
                  ))}
                </span>
              )}
            </>
          );
          const clase = cn(
            "group relative flex min-h-[17rem] flex-col justify-start overflow-hidden rounded-[1.5rem] p-6 pb-28 sm:p-8 sm:pb-32",
            t.caja,
          );
          return b.cta_href ? (
            <Link key={b.id} href={b.cta_href} className={cn(clase, "presionable")} prefetch={i === 0}>
              {contenido}
            </Link>
          ) : (
            <div key={b.id} className={clase}>
              {contenido}
            </div>
          );
        })}
      </div>
    </Contenedor>
  );
}
