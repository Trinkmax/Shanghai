"use client";

import { ArrowLeft, ArrowRight, ImagePlus, Star, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ImagenProducto } from "@/components/ui/ImagenProducto";
import { rutaMiniatura } from "@/lib/imagenes";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const MAX_FOTOS = 12;

/** Redimensiona en el navegador: WebP (o JPEG si el navegador no codifica WebP, p. ej. Safari). */
async function redimensionar(archivo: File, lado: number, calidad: number): Promise<Blob> {
  const bitmap = await createImageBitmap(archivo);
  const escala = Math.min(1, lado / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * escala));
  const h = Math.max(1, Math.round(bitmap.height * escala));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", calidad));
  if (blob && blob.type === "image/webp") return blob;
  const jpg = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", calidad + 0.06));
  if (!jpg) throw new Error("codificar");
  return jpg;
}

export function Fotos({
  clave,
  imagenes,
  onCambiar,
  deshabilitado,
}: {
  clave: string;
  imagenes: string[];
  onCambiar: (l: string[]) => void;
  deshabilitado?: string | null;
}) {
  const [subiendo, setSubiendo] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function subir(archivos: FileList | File[]) {
    const lista = Array.from(archivos).filter((f) => f.type.startsWith("image/"));
    if (lista.length === 0) return;
    const lugar = MAX_FOTOS - imagenes.length;
    if (lugar <= 0) return toast.error(`Máximo ${MAX_FOTOS} fotos por producto.`);
    const tomar = lista.slice(0, lugar);
    if (lista.length > lugar) toast.message(`Se agregan ${lugar} fotos: el máximo es ${MAX_FOTOS}.`);
    const sb = createClient();
    setSubiendo((n) => n + tomar.length);
    let actuales = [...imagenes];
    for (const f of tomar) {
      try {
        if (f.size > 25 * 1024 * 1024) throw new Error("La foto pesa más de 25 MB.");
        const [grande, chica] = await Promise.all([redimensionar(f, 1000, 0.8), redimensionar(f, 440, 0.74)]);
        const nombre = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
        const ruta = `productos/${clave}/${nombre}.webp`;
        const opciones = { cacheControl: "31536000", upsert: false } as const;
        const [a, b] = await Promise.all([
          sb.storage.from("shangai").upload(ruta, grande, { ...opciones, contentType: grande.type }),
          sb.storage.from("shangai").upload(rutaMiniatura(ruta), chica, { ...opciones, contentType: chica.type }),
        ]);
        if (a.error || b.error) throw new Error((a.error ?? b.error)?.message);
        actuales = [...actuales, ruta];
        onCambiar(actuales);
      } catch (e) {
        const m = e instanceof Error ? e.message : "";
        toast.error(`No se pudo subir ${f.name}`, {
          description: m.includes("row-level") ? "Tu rol no puede subir fotos." : m.includes("MB") ? m : "Probá con otra imagen (JPG, PNG o WebP).",
        });
      } finally {
        setSubiendo((n) => n - 1);
      }
    }
  }

  const mover = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= imagenes.length) return;
    const l = [...imagenes];
    [l[i], l[j]] = [l[j], l[i]];
    onCambiar(l);
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-5">
        {imagenes.map((r, i) => (
          <figure key={r} className="group relative overflow-hidden rounded-xl border border-aluminio bg-white">
            <ImagenProducto ruta={r} alt={`Foto ${i + 1}`} className="aspect-square w-full p-1.5" />
            {i === 0 && <span className="vinilo vinilo-marca absolute left-1.5 top-1.5">Principal</span>}
            <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
              <span className="flex gap-1">
                <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} className="grid size-7 place-items-center rounded-lg bg-white/95 text-tinta shadow disabled:opacity-40" aria-label="Mover a la izquierda">
                  <ArrowLeft className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => mover(i, 1)}
                  disabled={i === imagenes.length - 1}
                  className="grid size-7 place-items-center rounded-lg bg-white/95 text-tinta shadow disabled:opacity-40"
                  aria-label="Mover a la derecha"
                >
                  <ArrowRight className="size-3.5" />
                </button>
              </span>
              <span className="flex gap-1">
                {i > 0 && (
                  <button
                    type="button"
                    onClick={() => onCambiar([r, ...imagenes.filter((x) => x !== r)])}
                    className="grid size-7 place-items-center rounded-lg bg-white/95 text-marca-700 shadow"
                    aria-label="Usar como foto principal"
                  >
                    <Star className="size-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onCambiar(imagenes.filter((x) => x !== r))}
                  className="grid size-7 place-items-center rounded-lg bg-white/95 text-rojo shadow"
                  aria-label="Quitar foto"
                >
                  <X className="size-3.5" />
                </button>
              </span>
            </div>
          </figure>
        ))}
        {Array.from({ length: subiendo }).map((_, i) => (
          <div key={`s${i}`} className="esqueleto aspect-square rounded-xl" aria-label="Subiendo foto" />
        ))}
        {imagenes.length + subiendo < MAX_FOTOS && (
          <button
            type="button"
            disabled={Boolean(deshabilitado)}
            onClick={() => input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setArrastrando(true);
            }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={(e) => {
              e.preventDefault();
              setArrastrando(false);
              if (!deshabilitado) void subir(e.dataTransfer.files);
            }}
            className={cn(
              "flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-aluminio-2 bg-vidrio/60 p-2 text-center text-[0.8rem] font-medium text-tinta-2 transition-colors hover:border-marca-400 hover:bg-marca-50 hover:text-marca-700 disabled:cursor-not-allowed disabled:opacity-50",
              arrastrando && "border-marca-500 bg-marca-50 text-marca-700",
            )}
          >
            <ImagePlus className="size-6" />
            {imagenes.length === 0 ? "Subir fotos" : "Agregar"}
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) void subir(e.target.files);
          e.target.value = "";
        }}
      />
      <p className="mt-2.5 text-[0.8rem] text-tinta-3">
        {deshabilitado ??
          "Arrastrá fotos o tocá para elegirlas (también desde la cámara del celular). Se optimizan solas; la primera es la que se ve en la tienda."}
      </p>
    </div>
  );
}
