"use client";

import { ArrowDownWideNarrow, Check, ChevronDown, Loader2, Sparkles, Tag } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { FiltroCatalogo, OrdenCatalogo } from "@/lib/datos/catalogo";
import { formatNumero } from "@/lib/format";
import type { ProductoVista } from "@/lib/tienda";
import { cn } from "@/lib/utils";
import { TarjetaProducto } from "./TarjetaProducto";

export const ORDENES_UI: { id: OrdenCatalogo; texto: string }[] = [
  { id: "relevancia", texto: "Destacados" },
  { id: "nuevos", texto: "Más nuevos" },
  { id: "vendidos", texto: "Más vendidos" },
  { id: "precio-asc", texto: "Menor precio" },
  { id: "precio-desc", texto: "Mayor precio" },
  { id: "nombre", texto: "A–Z" },
];

/** Filtros en la URL: se pueden compartir y el "atrás" del navegador los respeta. */
export function BarraFiltros({
  total,
  ocultar = [],
  className,
}: {
  total: number;
  ocultar?: ("ofertas" | "novedades")[];
  className?: string;
}) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [pendiente, iniciar] = useTransition();
  const orden = (sp.get("orden") as OrdenCatalogo) || "relevancia";
  const ofertas = sp.get("ofertas") === "1";
  const novedades = sp.get("novedades") === "1";

  const set = useCallback(
    (clave: string, valor: string | null) => {
      const p = new URLSearchParams(sp.toString());
      if (valor === null || valor === "") p.delete(clave);
      else p.set(clave, valor);
      const q = p.toString();
      iniciar(() => router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false }));
    },
    [sp, router, pathname],
  );

  const chip =
    "presionable inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border px-3.5 text-[0.88rem] font-medium transition-colors";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="sin-scrollbar -mx-3 flex flex-1 items-center gap-2 overflow-x-auto px-3 sm:mx-0 sm:px-0">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button type="button" className={cn(chip, "border-aluminio-2 bg-white text-tinta hover:border-tinta-3")}>
              <ArrowDownWideNarrow className="size-4 text-tinta-3" />
              {ORDENES_UI.find((o) => o.id === orden)?.texto ?? "Ordenar"}
              <ChevronDown className="size-4 text-tinta-3" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="start"
              sideOffset={6}
              className="z-50 min-w-48 origin-[var(--radix-dropdown-menu-content-transform-origin)] rounded-2xl border border-aluminio bg-white p-1.5 shadow-[var(--shadow-flotante)] data-[state=open]:animate-[subir_160ms_var(--ease-out)]"
            >
              {ORDENES_UI.map((o) => (
                <DropdownMenu.Item
                  key={o.id}
                  onSelect={() => set("orden", o.id === "relevancia" ? null : o.id)}
                  className="flex cursor-pointer items-center justify-between gap-6 rounded-xl px-3 py-2.5 text-[0.92rem] text-tinta outline-none data-[highlighted]:bg-vidrio"
                >
                  {o.texto}
                  {o.id === orden && <Check className="size-4 text-marca-600" />}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        {!ocultar.includes("ofertas") && (
          <button
            type="button"
            aria-pressed={ofertas}
            onClick={() => set("ofertas", ofertas ? null : "1")}
            className={cn(
              chip,
              ofertas ? "border-ambar-2 bg-ambar text-ambar-tinta" : "border-aluminio-2 bg-white text-tinta hover:border-tinta-3",
            )}
          >
            <Tag className="size-4" /> Ofertas
          </button>
        )}
        {!ocultar.includes("novedades") && (
          <button
            type="button"
            aria-pressed={novedades}
            onClick={() => set("novedades", novedades ? null : "1")}
            className={cn(
              chip,
              novedades ? "border-marca-700 bg-marca-700 text-white" : "border-aluminio-2 bg-white text-tinta hover:border-tinta-3",
            )}
          >
            <Sparkles className="size-4" /> Novedades
          </button>
        )}
      </div>
      <p className="tabular hidden shrink-0 items-center gap-2 text-sm text-tinta-3 sm:flex" aria-live="polite">
        {pendiente && <Loader2 className="size-4 animate-spin" />}
        {formatNumero(total)} {total === 1 ? "producto" : "productos"}
      </p>
    </div>
  );
}

/** Grilla con carga progresiva: primeros 48 del servidor, el resto se pide al bajar. */
export function ListadoProductos({
  inicial,
  total,
  filtro,
  puestos = false,
  vacio,
}: {
  inicial: ProductoVista[];
  total: number;
  filtro: FiltroCatalogo;
  puestos?: boolean;
  vacio?: React.ReactNode;
}) {
  const [lista, setLista] = useState(inicial);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(false);
  const centinela = useRef<HTMLDivElement>(null);
  const cargarMas = useCallback(async () => {
    if (cargando || lista.length >= total) return;
    setCargando(true);
    setError(false);
    try {
      const p = new URLSearchParams();
      if (filtro.rubro) p.set("rubro", String(filtro.rubro));
      if (filtro.ofertas) p.set("ofertas", "1");
      if (filtro.novedades) p.set("novedades", "1");
      if (filtro.vendidos) p.set("vendidos", "1");
      if (filtro.q) p.set("q", filtro.q);
      if (filtro.orden) p.set("orden", filtro.orden);
      p.set("desde", String(lista.length));
      p.set("cantidad", "48");
      const r = await fetch(`/api/productos?${p}`);
      if (!r.ok) throw new Error();
      const d = (await r.json()) as { productos: ProductoVista[] };
      setLista((l) => {
        const vistos = new Set(l.map((x) => x.id));
        return [...l, ...d.productos.filter((x) => !vistos.has(x.id))];
      });
    } catch {
      setError(true);
    } finally {
      setCargando(false);
    }
  }, [cargando, lista.length, total, filtro]);

  useEffect(() => {
    const el = centinela.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && !error && cargarMas(), { rootMargin: "900px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [cargarMas, error]);

  if (total === 0) return <>{vacio}</>;

  return (
    <>
      <div className="vidriera">
        <div className="vidriera-grilla grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {lista.map((p, i) => (
            <TarjetaProducto key={p.id} producto={p} prioridad={i < 4} puesto={puestos ? i + 1 : undefined} />
          ))}
        </div>
      </div>
      <div ref={centinela} className="flex flex-col items-center gap-3 py-8">
        {lista.length < total ? (
          error ? (
            <button type="button" onClick={cargarMas} className="rounded-xl border border-aluminio-2 bg-white px-4 py-2.5 text-sm font-semibold text-tinta">
              No se pudieron cargar más. Reintentar
            </button>
          ) : (
            <span className="inline-flex items-center gap-2 text-sm text-tinta-3">
              <Loader2 className="size-4 animate-spin" /> Cargando más productos…
            </span>
          )
        ) : (
          lista.length > 12 && (
            <p className="tabular text-sm text-tinta-3">
              Viste los {formatNumero(total)} productos
            </p>
          )
        )}
      </div>
    </>
  );
}
