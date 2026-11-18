"use client";

import { Command } from "cmdk";
import { ArrowRight, Clock, CornerDownLeft, Plus, Search, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { FichaRubro } from "@/components/ui/IconoRubro";
import { ImagenProducto } from "@/components/ui/ImagenProducto";
import { cargarIndice, useIndice } from "@/hooks/useIndice";
import { useCantidadDe } from "@/lib/carrito";
import { buscar, resaltar } from "@/lib/busqueda";
import type { ItemIndice } from "@/lib/datos/catalogo";
import { formatARS } from "@/lib/format";
import { guardarBusqueda, leerBusquedas } from "@/lib/locales";
import { useUI } from "@/lib/ui";
import { cn, normalizar } from "@/lib/utils";
import { useTienda } from "./ContextoTienda";
import { useAgregar } from "./useAgregar";

function FilaProducto({ item, consulta, onIr }: { item: ItemIndice; consulta: string; onIr: () => void }) {
  const agregar = useAgregar();
  const enPedido = useCantidadDe(item.i);
  const agotado = item.x !== null && item.x <= 0;
  return (
    <Command.Item
      value={`p-${item.i}`}
      onSelect={onIr}
      className="group flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 aria-selected:bg-vidrio"
    >
      <ImagenProducto ruta={item.m} alt="" className="size-12 shrink-0 rounded-lg border border-aluminio" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.93rem] text-tinta">
          {resaltar(item.n, consulta).map((t, i) =>
            t.m ? (
              <mark key={i} className="rounded-[3px] bg-marca-100 px-px text-marca-900">
                {t.t}
              </mark>
            ) : (
              <span key={i}>{t.t}</span>
            ),
          )}
        </p>
        <p className="tabular mt-0.5 flex items-center gap-2 text-[0.75rem] text-tinta-3">
          Cód. {item.c}
          {item.o === 1 && <span className="vinilo vinilo-ambar !px-1.5 !py-0.5 !text-[0.6rem]">Oferta</span>}
          {agotado && <span className="font-semibold text-rojo">Agotado</span>}
          {enPedido > 0 && <span className="font-semibold text-marca-600">· {enPedido} en tu pedido</span>}
        </p>
      </div>
      <div className="text-right">
        <p className="tabular text-[0.95rem] font-bold text-tinta">{formatARS(item.p)}</p>
        {item.l && <p className="tabular text-[0.72rem] text-tinta-3 line-through">{formatARS(item.l)}</p>}
      </div>
      {!agotado && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            agregar({
              id: item.i,
              codigo: item.c,
              slug: item.s,
              nombre: item.n,
              imagen: item.m,
              precio_final: item.p,
              precio_lista: item.l,
              cantidad_minima: item.q,
              stock: item.x,
            });
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="cartel presionable grid size-9 shrink-0 place-items-center rounded-lg"
          aria-label={`Agregar ${item.n} al pedido`}
        >
          <Plus className="size-4" strokeWidth={2.5} />
        </button>
      )}
    </Command.Item>
  );
}

export function Buscador() {
  const abierto = useUI((s) => s.buscador);
  const setAbierto = useUI((s) => s.setBuscador);
  const { categorias } = useTienda();
  const router = useRouter();
  const [consulta, setConsulta] = useState("");
  const diferida = useDeferredValue(consulta);
  const { indice, error } = useIndice(abierto);

  // Precarga del índice cuando el navegador está libre: la primera búsqueda ya es instantánea.
  useEffect(() => {
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    const id = ric ? ric(() => void cargarIndice().catch(() => undefined)) : window.setTimeout(() => void cargarIndice().catch(() => undefined), 2500);
    return () => {
      if (!ric) clearTimeout(id);
    };
  }, []);

  // Búsquedas recientes: se leen al abrir (localStorage es síncrono y solo existe en el navegador).
  const recientes = useMemo(() => (abierto ? leerBusquedas() : []), [abierto]);

  const resultados = useMemo(() => (indice ? buscar(indice, diferida, 40) : []), [indice, diferida]);
  const rubros = useMemo(() => {
    const q = normalizar(diferida).trim();
    if (q.length < 2) return [];
    return categorias.filter((c) => normalizar(c.nombre).includes(q)).slice(0, 4);
  }, [categorias, diferida]);

  function ir(href: string) {
    if (consulta.trim()) guardarBusqueda(consulta);
    setAbierto(false);
    setConsulta("");
    router.push(href);
  }

  const hayConsulta = diferida.trim().length > 0;

  return (
    <Dialog.Root
      open={abierto}
      onOpenChange={(v) => {
        setAbierto(v);
        if (!v) setConsulta("");
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-tinta/45 backdrop-blur-[2px] data-[state=open]:animate-[subir_120ms_ease-out]" />
        <Dialog.Content
          className="fixed inset-0 z-[60] flex flex-col bg-white outline-none sm:inset-auto sm:left-1/2 sm:top-[9vh] sm:max-h-[78vh] sm:w-[min(720px,calc(100vw-32px))] sm:-translate-x-1/2 sm:rounded-[1.5rem] sm:shadow-[var(--shadow-flotante)]"
          aria-describedby={undefined}
        >
          <Dialog.Title className="sr-only">Buscar productos</Dialog.Title>
          <Command shouldFilter={false} loop className="flex min-h-0 flex-1 flex-col" label="Buscar productos">
            <div className="flex items-center gap-3 border-b border-aluminio px-4 pt-[max(0.5rem,env(safe-area-inset-top))] sm:pt-0">
              <Search className="size-5 shrink-0 text-marca-500" />
              <Command.Input
                value={consulta}
                onValueChange={setConsulta}
                autoFocus
                placeholder="Buscá por nombre o código…"
                className="h-16 min-w-0 flex-1 bg-transparent text-[1.05rem] text-tinta outline-none sm:text-lg"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && consulta.trim()) ir(`/catalogo?q=${encodeURIComponent(consulta.trim())}`);
                }}
              />
              {consulta && (
                <button
                  type="button"
                  onClick={() => setConsulta("")}
                  className="grid size-8 place-items-center rounded-lg text-tinta-3 hover:bg-vidrio"
                  aria-label="Borrar búsqueda"
                >
                  <X className="size-4" />
                </button>
              )}
              <Dialog.Close className="rounded-lg px-2 py-1.5 text-sm font-medium text-tinta-2 hover:bg-vidrio sm:hidden">
                Cerrar
              </Dialog.Close>
            </div>

            <Command.List className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 sm:max-h-[calc(78vh-8rem)]">
              {!hayConsulta && (
                <>
                  {recientes.length > 0 && (
                    <Command.Group heading="Buscaste hace poco" className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-tinta-3">
                      {recientes.map((r) => (
                        <Command.Item
                          key={r}
                          value={`r-${r}`}
                          onSelect={() => setConsulta(r)}
                          className="flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2.5 text-[0.93rem] text-tinta-2 aria-selected:bg-vidrio"
                        >
                          <Clock className="size-4 text-tinta-3" /> {r}
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )}
                  <Command.Group heading="Rubros" className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-tinta-3">
                    <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                      {categorias.slice(0, 12).map((c) => (
                        <Command.Item
                          key={c.id}
                          value={`c-${c.slug}`}
                          onSelect={() => ir(`/rubro/${c.slug}`)}
                          className="flex cursor-pointer items-center gap-2.5 rounded-xl p-2 text-[0.88rem] text-tinta aria-selected:bg-vidrio"
                        >
                          <FichaRubro icono={c.icono} color={c.color} tam="sm" />
                          <span className="truncate">{c.nombre}</span>
                        </Command.Item>
                      ))}
                    </div>
                  </Command.Group>
                  <p className="px-3 pb-2 pt-4 text-[0.8rem] text-tinta-3">
                    Tip: escribí el código del producto (por ejemplo <span className="tabular font-semibold text-tinta-2">99099</span>) para ir directo.
                  </p>
                </>
              )}

              {hayConsulta && rubros.length > 0 && (
                <Command.Group heading="Rubros" className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-tinta-3">
                  {rubros.map((c) => (
                    <Command.Item
                      key={c.id}
                      value={`c-${c.slug}`}
                      onSelect={() => ir(`/rubro/${c.slug}`)}
                      className="flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 aria-selected:bg-vidrio"
                    >
                      <FichaRubro icono={c.icono} color={c.color} tam="sm" />
                      <span className="flex-1 text-[0.93rem] text-tinta">{c.nombre}</span>
                      <span className="tabular text-xs text-tinta-3">{c.cantidad} productos</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {hayConsulta && !indice && !error && (
                <div className="space-y-2 p-2" aria-label="Cargando catálogo">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="esqueleto size-12 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <div className="esqueleto h-3.5 w-3/4" />
                        <div className="esqueleto h-3 w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {hayConsulta && error && (
                <p className="p-6 text-center text-tinta-2">No pudimos cargar el catálogo. Revisá tu conexión y volvé a abrir el buscador.</p>
              )}

              {hayConsulta && indice && (
                <Command.Group
                  heading={resultados.length ? `Productos` : undefined}
                  className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-tinta-3"
                >
                  {resultados.map((r) => (
                    <FilaProducto key={r.item.i} item={r.item} consulta={diferida} onIr={() => ir(`/producto/${r.item.s}`)} />
                  ))}
                </Command.Group>
              )}

              {hayConsulta && indice && resultados.length === 0 && rubros.length === 0 && (
                <div className="px-6 py-10 text-center">
                  <p className="font-semibold text-tinta">No encontramos “{diferida.trim()}”</p>
                  <p className="mt-1 text-[0.93rem] text-tinta-2">Probá con otra palabra, el código o buscá por rubro.</p>
                </div>
              )}
            </Command.List>

            {hayConsulta && resultados.length > 0 && (
              <div className="flex items-center justify-between gap-3 border-t border-aluminio px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <span className="hidden items-center gap-1.5 text-xs text-tinta-3 sm:flex">
                  <CornerDownLeft className="size-3.5" /> para abrir · ↑↓ para moverte
                </span>
                <button
                  type="button"
                  onClick={() => ir(`/catalogo?q=${encodeURIComponent(consulta.trim())}`)}
                  className={cn("ml-auto inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-marca-700 hover:bg-marca-50")}
                >
                  Ver todos los resultados <ArrowRight className="size-4" />
                </button>
              </div>
            )}
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
