"use client";

import { ArrowRight, Plus, ShoppingBag, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Drawer } from "vaul";
import { Isotipo } from "@/components/marca/Isotipo";
import { Boton } from "@/components/ui/Boton";
import { ImagenProducto } from "@/components/ui/ImagenProducto";
import { Precio } from "@/components/ui/Precio";
import { cargarIndice, useMediaQuery } from "@/hooks/useIndice";
import { subtotalDe, unidadesDe, useCarrito, useCarritoHidratado, type ItemCarrito } from "@/lib/carrito";
import { formatARS, plural } from "@/lib/format";
import type { ProductoVista } from "@/lib/tienda";
import { cn } from "@/lib/utils";
import { useTienda } from "./ContextoTienda";
import { ControlCantidad } from "./ControlCantidad";
import { MedidorMinimo } from "./MedidorMinimo";
import { aCarrito } from "./TarjetaProducto";
import { useAgregar } from "./useAgregar";

function Renglon({ it }: { it: ItemCarrito }) {
  const fijar = useCarrito((s) => s.fijar);
  const quitar = useCarrito((s) => s.quitar);
  const restaurar = useCarrito((s) => s.restaurar);
  const cerrar = useCarrito((s) => s.cerrar);
  const reducir = useReducedMotion();

  function sacar() {
    const item = quitar(it.id);
    if (item) toast(`Quitaste ${item.nombre}`, { action: { label: "Deshacer", onClick: () => restaurar(item) } });
  }

  return (
    <motion.li
      layout={reducir ? false : "position"}
      initial={false}
      exit={reducir ? { opacity: 0 } : { opacity: 0, x: 24, transition: { duration: 0.18 } }}
      className="flex gap-3 py-3.5"
    >
      <Link href={`/producto/${it.slug}`} onClick={cerrar} className="shrink-0 overflow-hidden rounded-xl border border-aluminio">
        <ImagenProducto ruta={it.imagen} alt={it.nombre} tam="xs" className="size-[72px]" />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/producto/${it.slug}`}
            onClick={cerrar}
            className="line-clamp-2 text-[0.92rem] font-medium leading-snug text-tinta hover:underline"
          >
            {it.nombre}
          </Link>
          <button
            type="button"
            onClick={sacar}
            className="-mr-1 -mt-1 grid size-8 shrink-0 place-items-center rounded-lg text-tinta-3 hover:bg-vidrio hover:text-tinta"
            aria-label={`Quitar ${it.nombre}`}
          >
            <X className="size-4" />
          </button>
        </div>
        <p className="tabular mt-0.5 text-[0.75rem] text-tinta-3">
          Cód. {it.codigo} · {formatARS(it.precio)} c/u
        </p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <ControlCantidad
            tam="sm"
            valor={it.cantidad}
            minimo={it.minima}
            maximo={it.stock}
            onCambiar={(n) => fijar(it.id, n)}
            onQuitar={sacar}
            etiqueta={`Cantidad de ${it.nombre}`}
          />
          <span className="tabular text-[0.98rem] font-bold text-tinta">{formatARS(it.precio * it.cantidad)}</span>
        </div>
      </div>
    </motion.li>
  );
}

function Sugeridos({ falta, sugeridos }: { falta: number; sugeridos: ProductoVista[] }) {
  const items = useCarrito((s) => s.items);
  const agregar = useAgregar();
  const enPedido = new Set(items.map((i) => i.id));
  const lista = sugeridos.filter((p) => !enPedido.has(p.id) && !p.agotado).slice(0, 8);
  if (lista.length === 0) return null;
  return (
    <section className="mt-2 rounded-2xl bg-vidrio p-3.5" aria-labelledby="sugeridos-titulo">
      <h3 id="sugeridos-titulo" className="text-[0.92rem] font-semibold text-tinta">
        Para completar el mínimo
        <span className="ml-1 font-normal text-tinta-3">· faltan {formatARS(falta)}</span>
      </h3>
      <ul className="sin-scrollbar -mx-3.5 mt-3 flex snap-x gap-2.5 overflow-x-auto px-3.5 pb-1">
        {lista.map((p) => (
          <li key={p.id} className="w-[148px] shrink-0 snap-start overflow-hidden rounded-xl border border-aluminio bg-white">
            <ImagenProducto ruta={p.imagenes[0]} alt={p.nombre} className="aspect-square w-full p-2" />
            <div className="px-2.5 pb-2.5">
              <p className="line-clamp-2 min-h-[2.4em] text-[0.78rem] leading-tight text-tinta">{p.nombre}</p>
              <div className="mt-1.5 flex items-center justify-between">
                <Precio monto={p.precio_final} tam="sm" />
                <button
                  type="button"
                  onClick={() => agregar(aCarrito(p))}
                  className="cartel presionable grid size-8 place-items-center rounded-lg"
                  aria-label={`Agregar ${p.nombre}`}
                >
                  <Plus className="size-4" strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PanelPedido({ sugeridos }: { sugeridos: ProductoVista[] }) {
  const { compra_minima } = useTienda();
  const abierto = useCarrito((s) => s.abierto);
  const cerrar = useCarrito((s) => s.cerrar);
  const items = useCarrito((s) => s.items);
  const vaciar = useCarrito((s) => s.vaciar);
  const hidratado = useCarritoHidratado();
  const escritorio = useMediaQuery("(min-width: 768px)");
  const router = useRouter();
  const sincronizado = useRef(0);

  const lista = hidratado ? items : [];
  const subtotal = subtotalDe(lista);
  const unidades = unidadesDe(lista);
  const falta = Math.max(0, compra_minima - subtotal);

  // Al abrir, revisa precios y stock contra el catálogo vigente (como máximo cada 2 min).
  useEffect(() => {
    if (!abierto || items.length === 0 || Date.now() - sincronizado.current < 120_000) return;
    sincronizado.current = Date.now();
    cargarIndice(true)
      .then((indice) => {
        const mapa = new Map(indice.map((x) => [x.i, { p: x.p, l: x.l, x: x.x, q: x.q }] as const));
        const vigentes = new Map(items.map((it) => [it.id, mapa.get(it.id) ?? null] as const));
        const { cambios, quitados } = useCarrito.getState().sincronizar(vigentes);
        if (cambios.length)
          toast.message(cambios.length === 1 ? "Se actualizó un precio" : `Se actualizaron ${cambios.length} precios`, {
            description: cambios
              .slice(0, 3)
              .map((c) => `${c.nombre}: ${formatARS(c.ahora)}`)
              .join(" · "),
          });
        if (quitados.length) toast.warning(`Sacamos del pedido lo que ya no está disponible: ${quitados.join(", ")}`);
      })
      .catch(() => undefined);
  }, [abierto, items]);

  function finalizar() {
    cerrar();
    router.push("/checkout");
  }

  return (
    <Drawer.Root
      open={abierto}
      onOpenChange={(v) => (v ? useCarrito.getState().abrir() : cerrar())}
      direction={escritorio ? "right" : "bottom"}
      shouldScaleBackground={false}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-tinta/40 backdrop-blur-[1.5px]" />
        <Drawer.Content
          className={cn(
            "fixed z-50 flex flex-col bg-white outline-none",
            escritorio
              ? "inset-y-2 right-2 w-[440px] rounded-[1.5rem] shadow-[var(--shadow-flotante)]"
              : "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-[1.75rem]",
          )}
          aria-describedby={undefined}
        >
          {!escritorio && <Drawer.Handle className="!mt-2.5 !h-1.5 !w-12 !bg-aluminio-2" />}
          <header className="flex items-center justify-between gap-3 px-5 pb-3 pt-4">
            <div>
              <Drawer.Title className="text-lg font-bold text-tinta">Tu pedido</Drawer.Title>
              <p className="tabular text-sm text-tinta-3">
                {lista.length === 0 ? "Todavía no agregaste productos" : `${plural(lista.length, "producto", "productos")} · ${plural(unidades, "unidad", "unidades")}`}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {lista.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const copia = [...items];
                    vaciar();
                    toast("Vaciaste el pedido", {
                      action: { label: "Deshacer", onClick: () => copia.forEach((i) => useCarrito.getState().restaurar(i)) },
                    });
                  }}
                  className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-tinta-3 hover:bg-vidrio hover:text-tinta"
                >
                  Vaciar
                </button>
              )}
              <Drawer.Close className="grid size-10 place-items-center rounded-xl text-tinta-2 hover:bg-vidrio" aria-label="Cerrar">
                <X className="size-5" />
              </Drawer.Close>
            </div>
          </header>

          {lista.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-8 pb-10 pt-6 text-center">
              <Isotipo className="size-20 text-aluminio" grosor={6} />
              <p className="mt-5 text-lg font-semibold text-tinta">Tu pedido está vacío</p>
              <p className="mt-1.5 max-w-[30ch] text-[0.95rem] text-tinta-2">
                Sumá productos hasta llegar a la compra mínima de <span className="tabular font-semibold">{formatARS(compra_minima)}</span>.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <Boton asChild variante="ambar" tam="md">
                  <Link href="/ofertas" onClick={cerrar}>
                    Ver ofertas
                  </Link>
                </Boton>
                <Boton asChild variante="claro" tam="md">
                  <Link href="/mas-vendidos" onClick={cerrar}>
                    Más vendidos
                  </Link>
                </Boton>
              </div>
            </div>
          ) : (
            <>
              <div className="px-5 pb-3">
                <MedidorMinimo subtotal={subtotal} minimo={compra_minima} className="rounded-2xl border border-aluminio p-3.5" />
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5" data-vaul-no-drag>
                <ul className="divide-y divide-aluminio">
                  <AnimatePresence initial={false}>
                    {lista.map((it) => (
                      <Renglon key={it.id} it={it} />
                    ))}
                  </AnimatePresence>
                </ul>
                {falta > 0 && <Sugeridos falta={falta} sugeridos={sugeridos} />}
                <div className="h-4" />
              </div>
              <footer className="border-t border-aluminio px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
                <div className="mb-3 flex items-baseline justify-between">
                  <span className="text-[0.95rem] text-tinta-2">Subtotal</span>
                  <span className="tabular text-xl font-bold text-tinta">{formatARS(subtotal)}</span>
                </div>
                <Boton tam="lg" className="w-full" disabled={falta > 0} onClick={finalizar}>
                  {falta > 0 ? (
                    <>Te faltan {formatARS(falta)} para finalizar</>
                  ) : (
                    <>
                      Finalizar pedido
                      <ArrowRight className="size-5" />
                    </>
                  )}
                </Boton>
                <button
                  type="button"
                  onClick={cerrar}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium text-tinta-2 hover:bg-vidrio"
                >
                  <ShoppingBag className="size-4" /> Seguir comprando
                </button>
              </footer>
            </>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
