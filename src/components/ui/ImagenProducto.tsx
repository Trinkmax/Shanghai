"use client";

import { useState } from "react";
import { Isotipo } from "@/components/marca/Isotipo";
import { urlImagen } from "@/lib/imagenes";
import { cn } from "@/lib/utils";

/**
 * Foto de producto (ya optimizada en WebP en el bucket). Aparece con un fundido corto
 * cuando termina de cargar y, si falta, muestra la caja de la marca en vez de un ícono roto.
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
  tam?: "sm" | "lg";
  className?: string;
  prioridad?: boolean;
  sizes?: string;
}) {
  const [estado, setEstado] = useState<"cargando" | "ok" | "error">(ruta ? "cargando" : "error");
  const src = urlImagen(ruta, tam);

  return (
    <span className={cn("relative block overflow-hidden bg-white", className)}>
      {estado !== "error" && src && (
        // eslint-disable-next-line @next/next/no-img-element -- ya se sirven optimizadas desde Storage
        <img
          src={src}
          srcSet={tam === "lg" && ruta ? `${urlImagen(ruta, "sm")} 440w, ${src} 1000w` : undefined}
          sizes={sizes}
          alt={alt}
          loading={prioridad ? "eager" : "lazy"}
          fetchPriority={prioridad ? "high" : "auto"}
          decoding="async"
          draggable={false}
          onLoad={() => setEstado("ok")}
          onError={() => setEstado("error")}
          className={cn(
            "size-full object-contain transition-opacity duration-300 ease-out",
            estado === "ok" ? "opacity-100" : "opacity-0",
          )}
        />
      )}
      {estado === "cargando" && <span className="esqueleto absolute inset-[12%] rounded-xl" aria-hidden="true" />}
      {estado === "error" && (
        <span className="absolute inset-0 grid place-items-center bg-vidrio" aria-label={`${alt} (sin foto)`} role="img">
          <Isotipo className="size-[34%] text-aluminio-2" grosor={7} />
        </span>
      )}
    </span>
  );
}
