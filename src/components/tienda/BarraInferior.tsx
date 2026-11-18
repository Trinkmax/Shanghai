"use client";

import { Home, LayoutGrid, Search, Tag, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { Drawer } from "vaul";
import { FichaRubro } from "@/components/ui/IconoRubro";
import { subtotalDe, useCarrito, useCarritoHidratado } from "@/lib/carrito";
import { formatARS, formatNumero } from "@/lib/format";
import { useUI } from "@/lib/ui";
import { cn, normalizar } from "@/lib/utils";
import { useTienda } from "./ContextoTienda";
import { CajaProgreso } from "./MedidorMinimo";

function HojaRubros() {
  const abierto = useUI((s) => s.rubros);
  const setAbierto = useUI((s) => s.setRubros);
  const { categorias } = useTienda();
  const [filtro, setFiltro] = useState("");
  const lista = useMemo(() => {
    const q = normalizar(filtro.trim());
    return q ? categorias.filter((c) => normalizar(c.nombre).includes(q)) : categorias;
  }, [categorias, filtro]);

  return (
    <Drawer.Root open={abierto} onOpenChange={setAbierto}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-tinta/40" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col rounded-t-[1.75rem] bg-white outline-none" aria-describedby={undefined}>
          <Drawer.Handle className="!mt-2.5 !h-1.5 !w-12 !bg-aluminio-2" />
          <div className="flex items-center justify-between px-5 pb-2 pt-3">
            <Drawer.Title className="text-lg font-bold text-tinta">Rubros</Drawer.Title>
            <Drawer.Close className="grid size-10 place-items-center rounded-xl text-tinta-2 hover:bg-vidrio" aria-label="Cerrar">
              <X className="size-5" />
            </Drawer.Close>
          </div>
          <div className="px-5 pb-3">
            <input
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Filtrar rubros…"
              className="campo h-11"
              aria-label="Filtrar rubros"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-[max(1rem,env(safe-area-inset-bottom))]" data-vaul-no-drag>
            <Link href="/catalogo" onClick={() => setAbierto(false)} className="mx-2 mb-1 flex items-center justify-between rounded-xl bg-vidrio px-3.5 py-3 font-semibold text-tinta">
              Todo el catálogo
              <span className="tabular text-sm font-normal text-tinta-3">{formatNumero(categorias.reduce((t, c) => t + c.cantidad, 0))}</span>
            </Link>
            <ul className="grid grid-cols-1">
              {lista.map((c) => (
                <li key={c.id}>
                  <Link href={`/rubro/${c.slug}`} onClick={() => setAbierto(false)} className="flex items-center gap-3 rounded-xl px-2 py-2 active:bg-vidrio">
                    <FichaRubro icono={c.icono} color={c.color} tam="sm" />
                    <span className="flex-1 text-[0.98rem] text-tinta">{c.nombre}</span>
                    <span className="tabular text-sm text-tinta-3">{c.cantidad}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

export function BarraInferior({ ruta }: { ruta?: string }) {
  const pathname = ruta ?? "";
  const { compra_minima } = useTienda();
  const abrirBuscador = useUI((s) => s.abrirBuscador);
  const setRubros = useUI((s) => s.setRubros);
  const abrirPedido = useCarrito((s) => s.abrir);
  const hidratado = useCarritoHidratado();
  const items = useCarrito((s) => s.items);
  const subtotal = hidratado ? subtotalDe(items) : 0;

  const item = "flex flex-1 flex-col items-center justify-center gap-1 text-[0.68rem] font-semibold text-tinta-3 aria-[current=page]:text-marca-700";

  return (
    <>
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-aluminio bg-white/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        <div className="mx-auto flex h-16 max-w-xl items-stretch px-1">
          <Link href="/" aria-current={pathname === "/" ? "page" : undefined} className={item}>
            <Home className="size-[22px]" strokeWidth={2} />
            Inicio
          </Link>
          <button type="button" onClick={() => setRubros(true)} className={item} aria-current={pathname.startsWith("/rubro") ? "page" : undefined}>
            <LayoutGrid className="size-[22px]" strokeWidth={2} />
            Rubros
          </button>
          <button type="button" onClick={abrirBuscador} className={item}>
            <Search className="size-[22px]" strokeWidth={2} />
            Buscar
          </button>
          <Link href="/ofertas" aria-current={pathname === "/ofertas" ? "page" : undefined} className={item}>
            <Tag className="size-[22px]" strokeWidth={2} />
            Ofertas
          </Link>
          <button type="button" onClick={abrirPedido} className={cn(item, "text-tinta")} data-destino-carrito aria-label={`Tu pedido, ${formatARS(subtotal)}`}>
            <CajaProgreso progreso={subtotal / compra_minima} className="size-[22px]" grosor={11} />
            <span className="tabular">{subtotal > 0 ? formatARS(subtotal) : "Pedido"}</span>
          </button>
        </div>
      </nav>
      <HojaRubros />
    </>
  );
}

export function BarraInferiorConRuta() {
  const ruta = usePathname();
  return <BarraInferior ruta={ruta} />;
}
