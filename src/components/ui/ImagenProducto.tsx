"use client";

import { useCallback, useState } from "react";
import { Isotipo } from "@/components/marca/Isotipo";
import { urlImagen, type TamImagen } from "@/lib/imagenes";
import { cn } from "@/lib/utils";

/**
 * Foto de producto ya optimizada (WebP en 3 tamaños: xs 160px, sm 400px, lg 900px).
 * La imagen NUNCA se oculta esperando a JavaScript (si cargó antes de hidratar, se ve igual);
 * mientras carga, el marco muestra un gris muy claro. Si falta, aparece la caja de la marca.
 */
export function ImagenProducto({
  ruta,
  alt,
  tam = "sm",
  className,
  prioridad = false,
  sizes,
}: {
  ruta: string | null | undefined;
  alt: string;
  tam?: TamImagen;
  className?: string;
  prioridad?: boolean;
  sizes?: string;
}) {
  const [estado, setEstado] = useState<"cargando" | "ok" | "error">("cargando");
  const src = urlImagen(ruta, tam);

  // Si la foto ya terminó (o falló) antes de que React hidratara, onLoad/onError no llegan: se revisa al montar.
  const revisar = useCallback((el: HTMLImageElement | null) => {
    if (el?.complete) setEstado(el.naturalWidth > 0 ? "ok" : "error");
  }, []);

  if (!src || estado === "error") {
    return (
      <span
        className={cn("relative grid place-items-center overflow-hidden bg-vidrio", className)}
        role={alt ? "img" : undefined}
        aria-label={alt ? `${alt} (sin foto)` : undefined}
        aria-hidden={alt ? undefined : true}
      >
        <Isotipo className="size-[34%] text-aluminio-2" grosor={7} />
      </span>
    );
  }

  return (
    <span className={cn("relative block overflow-hidden transition-colors duration-300", estado === "ok" ? "bg-white" : "bg-[#f3f4f8]", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- ya se sirven optimizadas (sin cómputo de imágenes) */}
      <img
        ref={revisar}
        src={src}
        srcSet={tam === "lg" && ruta ? `${urlImagen(ruta, "sm")} 400w, ${src} 900w` : undefined}
        sizes={tam === "lg" ? (sizes ?? "(min-width: 1024px) 50vw, 100vw") : undefined}
        alt={alt}
        loading={prioridad ? "eager" : "lazy"}
        fetchPriority={prioridad ? "high" : "auto"}
        decoding="async"
        draggable={false}
        onLoad={() => setEstado("ok")}
        onError={() => setEstado("error")}
        className="size-full object-contain"
      />
    </span>
  );
}
