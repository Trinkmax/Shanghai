"use client";

import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { ImagenProducto } from "@/components/ui/ImagenProducto";
import { urlImagen } from "@/lib/imagenes";
import { cn } from "@/lib/utils";

/** Galería: deslizable en el celular, miniaturas + lupa en escritorio, visor a pantalla completa. */
export function Galeria({ imagenes, nombre, children }: { imagenes: string[]; nombre: string; children?: React.ReactNode }) {
  const fotos = imagenes.length ? imagenes : [null];
  const [actual, setActual] = useState(0);
  const [visor, setVisor] = useState(false);
  const pista = useRef<HTMLDivElement>(null);
  const [lupa, setLupa] = useState<{ x: number; y: number } | null>(null);

  const irA = useCallback((i: number) => {
    const el = pista.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const el = pista.current;
    if (!el) return;
    const alMover = () => setActual(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
    el.addEventListener("scroll", alMover, { passive: true });
    return () => el.removeEventListener("scroll", alMover);
  }, []);

  return (
    <div className={cn(fotos.length > 1 && "lg:grid lg:grid-cols-[76px_minmax(0,1fr)] lg:gap-3")}>
      {fotos.length > 1 && (
        <div className="hidden flex-col gap-2 lg:flex" role="tablist" aria-label="Fotos">
          {fotos.map((f, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={actual === i}
              onClick={() => irA(i)}
              className={cn(
                "overflow-hidden rounded-xl border bg-white transition-[border-color,box-shadow] duration-150",
                actual === i ? "border-marca-500 shadow-[0_0_0_3px_rgb(92_99_170/0.18)]" : "border-aluminio hover:border-aluminio-2",
              )}
              aria-label={`Foto ${i + 1}`}
            >
              <ImagenProducto ruta={f} alt="" className="aspect-square w-full p-1" />
            </button>
          ))}
        </div>
      )}

      <div className="relative">
        <div className="vidriera relative">
          <div ref={pista} className="sin-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain">
            {fotos.map((f, i) => (
              <button
                key={i}
                type="button"
                className="relative w-full shrink-0 snap-center cursor-zoom-in overflow-hidden"
                onClick={() => setVisor(true)}
                onMouseMove={(e) => {
                  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
                  const r = e.currentTarget.getBoundingClientRect();
                  setLupa({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
                }}
                onMouseLeave={() => setLupa(null)}
                aria-label={`Ampliar foto ${i + 1} de ${nombre}`}
              >
                <span
                  className="block transition-transform duration-300 ease-out"
                  style={
                    lupa && actual === i
                      ? { transform: "scale(1.9)", transformOrigin: `${lupa.x}% ${lupa.y}%` }
                      : { transform: "scale(1)" }
                  }
                >
                  <ImagenProducto ruta={f} alt={i === 0 ? nombre : `${nombre}, foto ${i + 1}`} tam="lg" prioridad={i === 0} sizes="(min-width: 1024px) 50vw, 100vw" className="aspect-square w-full p-4 sm:p-8" />
                </span>
              </button>
            ))}
          </div>
          {children}
          <span className="pointer-events-none absolute bottom-3 right-3 hidden items-center gap-1.5 rounded-lg bg-white/90 px-2 py-1 text-xs font-medium text-tinta-2 shadow-sm lg:inline-flex">
            <Expand className="size-3.5" /> Tocá para ampliar
          </span>
        </div>
        {fotos.length > 1 && (
          <div className="mt-3 flex justify-center gap-1.5 lg:hidden" aria-hidden="true">
            {fotos.map((_, i) => (
              <span
                key={i}
                className={cn("h-1.5 rounded-full transition-[width,background-color] duration-300 ease-out", actual === i ? "w-6 bg-marca-600" : "w-1.5 bg-aluminio-2")}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog.Root open={visor} onOpenChange={setVisor}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[70] bg-tinta/85 backdrop-blur-sm data-[state=open]:animate-[subir_160ms_ease-out]" />
          <Dialog.Content className="fixed inset-0 z-[70] flex items-center justify-center p-3 outline-none sm:p-8" aria-describedby={undefined}>
            <Dialog.Title className="sr-only">{nombre}</Dialog.Title>
            <div className="relative w-full max-w-3xl overflow-hidden rounded-[1.5rem] bg-white">
              {fotos[actual] ? (
                // eslint-disable-next-line @next/next/no-img-element -- imagen ya optimizada
                <img src={urlImagen(fotos[actual], "lg") ?? ""} alt={nombre} className="aspect-square w-full object-contain p-4" />
              ) : (
                <ImagenProducto ruta={null} alt={nombre} className="aspect-square w-full" />
              )}
              {fotos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setActual((a) => (a - 1 + fotos.length) % fotos.length)}
                    className="absolute left-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-tinta shadow-md"
                    aria-label="Foto anterior"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActual((a) => (a + 1) % fotos.length)}
                    className="absolute right-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-tinta shadow-md"
                    aria-label="Foto siguiente"
                  >
                    <ChevronRight className="size-5" />
                  </button>
                </>
              )}
              <Dialog.Close className="absolute right-3 top-3 grid size-11 place-items-center rounded-full bg-white/95 text-tinta shadow-md" aria-label="Cerrar">
                <X className="size-5" />
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
