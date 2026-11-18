"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

const FILTROS = [
  { id: "", texto: "Todos" },
  { id: "oferta", texto: "En oferta" },
  { id: "novedad", texto: "Nuevos" },
  { id: "destacado", texto: "En vidriera" },
  { id: "ranking", texto: "En ranking" },
  { id: "stock_bajo", texto: "Poco stock" },
  { id: "sin_foto", texto: "Sin foto" },
];

/** Filtros de la lista de productos: escriben en la URL (se pueden compartir y volver atrás). */
export function FiltrosProductos({ rubros }: { rubros: { id: number; nombre: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pendiente, empezar] = useTransition();

  function set(k: string, v: string) {
    const q = new URLSearchParams(params.toString());
    if (v) q.set(k, v);
    else q.delete(k);
    q.delete("pagina");
    const s = q.toString();
    empezar(() => router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false }));
  }

  const filtro = params.get("filtro") ?? "";
  return (
    <div className={cn("flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center", pendiente && "opacity-70")}>
      <div className="sin-scrollbar -mx-3 flex gap-1 overflow-x-auto px-3 sm:mx-0 sm:px-0">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => set("filtro", f.id)}
            aria-pressed={filtro === f.id}
            className="h-9 shrink-0 rounded-xl px-3 text-sm font-medium text-tinta-2 transition-colors hover:bg-white hover:text-tinta aria-pressed:bg-white aria-pressed:text-tinta aria-pressed:shadow-[0_0_0_1px_var(--color-aluminio)]"
          >
            {f.texto}
          </button>
        ))}
      </div>
      <div className="flex gap-2 sm:ml-auto">
        <select
          value={params.get("rubro") ?? ""}
          onChange={(e) => set("rubro", e.target.value)}
          className="campo h-10 w-full rounded-xl px-3 text-sm sm:w-48"
          aria-label="Filtrar por rubro"
        >
          <option value="">Todos los rubros</option>
          <option value="sin">Sin rubro</option>
          {rubros.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nombre}
            </option>
          ))}
        </select>
        <select
          value={params.get("estado") ?? ""}
          onChange={(e) => set("estado", e.target.value)}
          className="campo h-10 w-full rounded-xl px-3 text-sm sm:w-36"
          aria-label="Filtrar por visibilidad"
        >
          <option value="">Visibles y ocultos</option>
          <option value="activos">Solo visibles</option>
          <option value="ocultos">Solo ocultos</option>
        </select>
        <select
          value={params.get("orden") ?? ""}
          onChange={(e) => set("orden", e.target.value)}
          className="campo h-10 w-full rounded-xl px-3 text-sm sm:w-40"
          aria-label="Ordenar"
        >
          <option value="">A–Z</option>
          <option value="recientes">Editados recién</option>
          <option value="precio-asc">Menor precio</option>
          <option value="precio-desc">Mayor precio</option>
          <option value="vendidos">Más vendidos</option>
        </select>
      </div>
    </div>
  );
}
