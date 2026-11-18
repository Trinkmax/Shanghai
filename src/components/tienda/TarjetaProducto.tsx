"use client";

import { Heart, Plus } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRef } from "react";
import { ImagenProducto } from "@/components/ui/ImagenProducto";
import { Precio } from "@/components/ui/Precio";
import { useCarrito, useCarritoHidratado, useCantidadDe } from "@/lib/carrito";
import { useFavoritos } from "@/lib/locales";
import type { ProductoVista } from "@/lib/tienda";
import { cn } from "@/lib/utils";
import { ControlCantidad } from "./ControlCantidad";
import { useAgregar } from "./useAgregar";

export function aCarrito(p: ProductoVista) {
  return {
    id: p.id,
    codigo: p.codigo,
    slug: p.slug,
    nombre: p.nombre,
    imagen: p.imagenes[0] ?? null,
    precio_final: p.precio_final,
    precio_lista: p.precio_lista,
    cantidad_minima: p.cantidad_minima,
    stock: p.stock,
  };
}

export function Vinilos({ p, puesto, className }: { p: ProductoVista; puesto?: number; className?: string }) {
  const lista: { clave: string; texto: string; clase: string }[] = [];
  if (p.agotado) lista.push({ clave: "agotado", texto: "Agotado", clase: "vinilo-tinta" });
  if (puesto) lista.push({ clave: "puesto", texto: `Nº ${puesto}`, clase: "vinilo-blanco" });
  if (p.descuento > 0) lista.push({ clave: "desc", texto: `−${p.descuento}%`, clase: "vinilo-ambar" });
  else if (p.oferta) lista.push({ clave: "oferta", texto: "Oferta", clase: "vinilo-ambar" });
  if (p.es_novedad && lista.length < 2) lista.push({ clave: "nuevo", texto: "Nuevo", clase: "vinilo-marca" });
  if (lista.length === 0) return null;
  return (
    <span className={cn("pointer-events-none flex flex-col items-start gap-1", className)}>
      {lista.slice(0, 2).map((v) => (
        <span key={v.clave} className={cn("vinilo", v.clase)}>
          {v.texto}
        </span>
      ))}
    </span>
  );
}

export function BotonFavorito({ id, nombre, className }: { id: string; nombre: string; className?: string }) {
  const hidratado = useCarritoHidratado();
  const activo = useFavoritos((s) => s.ids.includes(id)) && hidratado;
  const alternar = useFavoritos((s) => s.alternar);
  const reducir = useReducedMotion();
  return (
    <button
      type="button"
      onClick={() => alternar(id)}
      aria-pressed={activo}
      aria-label={activo ? `Quitar ${nombre} de favoritos` : `Guardar ${nombre} en favoritos`}
      className={cn(
        "presionable grid size-9 place-items-center rounded-full bg-white/85 text-tinta-3 backdrop-blur-[2px] transition-colors hover:text-rojo",
        activo && "text-rojo",
        className,
      )}
    >
      <motion.span
        key={String(activo)}
        initial={reducir || !activo ? false : { scale: 0.7 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", duration: 0.35, bounce: 0.45 }}
        className="grid place-items-center"
      >
        <Heart className="size-[18px]" fill={activo ? "currentColor" : "none"} strokeWidth={2} />
      </motion.span>
    </button>
  );
}

/** Fila de acción: "Agregar" → selector de cantidad, mismo alto (la grilla no salta). */
export function AccionAgregar({ p, origen }: { p: ProductoVista; origen: React.RefObject<HTMLElement | null> }) {
  const hidratado = useCarritoHidratado();
  const cantidadReal = useCantidadDe(p.id);
  const cantidad = hidratado ? cantidadReal : 0;
  const agregar = useAgregar();
  const fijar = useCarrito((s) => s.fijar);
  const quitar = useCarrito((s) => s.quitar);
  const reducir = useReducedMotion();

  if (p.agotado) {
    return (
      <div className="grid h-10 place-items-center rounded-xl bg-vidrio text-sm font-medium text-tinta-3">Sin stock</div>
    );
  }

  return (
    <div className="relative h-10">
      <AnimatePresence initial={false} mode="popLayout">
        {cantidad === 0 ? (
          <motion.button
            key="agregar"
            type="button"
            initial={reducir ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reducir ? { opacity: 0 } : { opacity: 0, scale: 0.96, filter: "blur(2px)" }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            onClick={() => agregar(aCarrito(p), undefined, origen.current)}
            className="cartel presionable relative z-10 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl text-sm font-semibold"
            aria-label={`Agregar ${p.nombre} al pedido`}
          >
            <Plus className="size-4" strokeWidth={2.5} />
            Agregar
          </motion.button>
        ) : (
          <motion.div
            key="cantidad"
            initial={reducir ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reducir ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            className="relative z-10"
          >
            <ControlCantidad
              tam="sm"
              className="h-10 w-full justify-between border-marca-300 bg-marca-50 [&>button:nth-child(2)]:flex-1"
              valor={cantidad}
              minimo={p.cantidad_minima}
              maximo={p.stock}
              onCambiar={(n) => (n > cantidad ? agregar(aCarrito(p), n - cantidad, null) : fijar(p.id, n))}
              onQuitar={() => quitar(p.id)}
              etiqueta={`Cantidad de ${p.nombre}`}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function TarjetaProducto({
  producto: p,
  prioridad = false,
  puesto,
  className,
}: {
  producto: ProductoVista;
  prioridad?: boolean;
  puesto?: number;
  className?: string;
}) {
  const foto = useRef<HTMLSpanElement>(null);
  const href = `/producto/${p.slug}`;

  return (
    <article className={cn("group relative flex flex-col bg-white", className)}>
      <div className="reflejo relative">
        <Link href={href} className="block p-3 pb-1 sm:p-4 sm:pb-1" aria-label={p.nombre} tabIndex={-1}>
          <span ref={foto} className="block">
            <ImagenProducto
              ruta={p.imagenes[0]}
              alt={p.nombre}
              prioridad={prioridad}
              className={cn(
                "aspect-square w-full transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.035]",
                p.agotado && "opacity-55 grayscale",
              )}
            />
          </span>
        </Link>
        <Vinilos p={p} puesto={puesto} className="absolute left-2.5 top-2.5 sm:left-3 sm:top-3" />
        <BotonFavorito id={p.id} nombre={p.nombre} className="absolute right-2 top-2 z-10 sm:right-2.5 sm:top-2.5" />
      </div>

      <div className="flex flex-1 flex-col gap-2 px-3 pb-3 sm:px-4 sm:pb-4">
        <Link href={href} className="group/nombre block">
          <h3 className="line-clamp-2 min-h-[2.5em] text-[0.9rem] font-medium leading-[1.25] text-tinta decoration-marca-300 group-hover/nombre:underline sm:text-[0.95rem]">
            {p.nombre}
          </h3>
        </Link>
        <div className="mt-auto flex items-end justify-between gap-2">
          <div className="min-w-0">
            <Precio monto={p.precio_final} tachado={p.precio_lista} tam="md" />
            <p className="tabular mt-1 truncate text-[0.72rem] text-tinta-3">
              Cód. {p.codigo}
              {p.cantidad_minima > 1 && <span className="font-semibold text-tinta-2"> · mín. {p.cantidad_minima} u.</span>}
            </p>
          </div>
        </div>
        <AccionAgregar p={p} origen={foto} />
      </div>
    </article>
  );
}
