"use client";

import { Check, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ImagenProducto } from "@/components/ui/ImagenProducto";
import { buscar } from "@/lib/busqueda";
import type { ItemIndice } from "@/lib/datos/catalogo";
import { formatARS } from "@/lib/format";
import { cn } from "@/lib/utils";

let cache: ItemIndice[] | null = null;
let promesa: Promise<ItemIndice[]> | null = null;

/** Catálogo liviano (el mismo índice que usa el buscador de la tienda). */
export function useIndiceCatalogo() {
  const [indice, setIndice] = useState<ItemIndice[] | null>(cache);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (cache) return;
    promesa ??= fetch("/api/indice", { cache: "no-store" }).then((r) => (r.ok ? r.json() : Promise.reject(new Error("indice"))));
    promesa
      .then((d) => {
        cache = d;
        setIndice(d);
      })
      .catch(() => {
        promesa = null;
        setError(true);
      });
  }, []);
  return { indice, error };
}

/** Buscador de productos para sumar a ofertas, ranking o vidriera. */
export function SelectorProductos({
  onElegir,
  elegidos,
  placeholder = "Buscá el producto por nombre o código…",
  accion = "Agregar",
  className,
}: {
  onElegir: (it: ItemIndice) => void;
  elegidos?: Set<string>;
  placeholder?: string;
  accion?: string;
  className?: string;
}) {
  const { indice, error } = useIndiceCatalogo();
  const [q, setQ] = useState("");
  const resultados = useMemo(() => (indice && q.trim() ? buscar(indice, q, 12) : []), [indice, q]);

  return (
    <div className={className}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-marca-500" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={indice ? placeholder : "Cargando catálogo…"}
          disabled={!indice}
          className="campo h-11 pl-10"
          aria-label={placeholder}
          type="search"
        />
      </div>
      {error && <p className="mt-2 text-sm text-rojo">No pudimos cargar el catálogo. Recargá la página.</p>}
      {q.trim() && indice && (
        <ul className="mt-2 max-h-80 divide-y divide-aluminio overflow-y-auto rounded-xl border border-aluminio">
          {resultados.length === 0 ? (
            <li className="px-4 py-5 text-center text-[0.9rem] text-tinta-3">Sin resultados para “{q.trim()}”.</li>
          ) : (
            resultados.map(({ item }) => {
              const ya = elegidos?.has(item.i);
              return (
                <li key={item.i} className="flex items-center gap-3 px-3 py-2">
                  <ImagenProducto ruta={item.m} alt="" tam="xs" className="size-10 shrink-0 rounded-lg border border-aluminio" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.9rem] text-tinta">{item.n}</span>
                    <span className="tabular text-[0.75rem] text-tinta-3">
                      Cód. {item.c} · {formatARS(item.l ?? item.p)}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onElegir(item)}
                    disabled={ya}
                    className={cn(
                      "presionable inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold",
                      ya ? "bg-vidrio text-tinta-3" : "bg-marca-700 text-white hover:bg-marca-600",
                    )}
                  >
                    {ya ? <Check className="size-4" /> : <Plus className="size-4" />}
                    {ya ? "Agregado" : accion}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
