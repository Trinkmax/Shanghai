"use client";

import { ChevronDown, Heart, MapPin, Search } from "lucide-react";
import { Popover } from "radix-ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logotipo } from "@/components/marca/Isotipo";
import { FichaRubro } from "@/components/ui/IconoRubro";
import { useCarrito, useCarritoHidratado, subtotalDe, unidadesDe } from "@/lib/carrito";
import { formatARS, formatNumero, linkWhatsApp } from "@/lib/format";
import { estadoLocal, type EstadoLocal } from "@/lib/tienda";
import { useUI } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { useTienda } from "./ContextoTienda";
import { escucharAgregado } from "./eventos";
import { CajaProgreso } from "./MedidorMinimo";

const NAV = [
  { href: "/ofertas", texto: "Ofertas" },
  { href: "/mas-vendidos", texto: "Más vendidos" },
  { href: "/novedades", texto: "Novedades" },
];

function useEstadoLocal(): EstadoLocal {
  const { horarios } = useTienda();
  const [estado, setEstado] = useState<EstadoLocal>(null);
  useEffect(() => {
    const calc = () => setEstado(estadoLocal(horarios));
    const primero = setTimeout(calc, 0);
    const t = setInterval(calc, 60_000);
    return () => {
      clearTimeout(primero);
      clearInterval(t);
    };
  }, [horarios]);
  return estado;
}

function TiraSuperior() {
  const { compra_minima, direccion, ciudad, whatsapp } = useTienda();
  const local = useEstadoLocal();
  return (
    <div className="mx-auto flex h-9 max-w-[1440px] items-center justify-between gap-4 px-4 text-[0.78rem] text-tinta-2 sm:px-6">
      <p className="truncate">
        <span className="font-semibold text-tinta">Precios mayoristas</span>
        <span className="mx-2 text-aluminio-2">/</span>
        Compra mínima <span className="tabular font-semibold text-tinta">{formatARS(compra_minima)}</span>
      </p>
      <div className="hidden items-center gap-4 md:flex">
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="size-3.5 text-marca-500" />
          {direccion}, {ciudad}
        </span>
        {local && (
          <span className="inline-flex items-center gap-1.5">
            <span
              className={cn("size-2 rounded-full", local.abierto ? "bg-verde shadow-[0_0_0_3px_rgb(19_128_74/0.15)]" : "bg-aluminio-2")}
            />
            {local.texto}
          </span>
        )}
        <a href={linkWhatsApp(whatsapp)} target="_blank" rel="noreferrer" className="font-semibold text-tinta hover:text-marca-600">
          WhatsApp
        </a>
      </div>
    </div>
  );
}

function MenuRubrosEscritorio() {
  const { categorias } = useTienda();
  const [abierto, setAbierto] = useState(false);
  return (
    <Popover.Root open={abierto} onOpenChange={setAbierto}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-[0.92rem] font-semibold text-white/90 transition-colors hover:bg-white/10 hover:text-white data-[state=open]:bg-white/12 data-[state=open]:text-white",
          )}
        >
          Rubros
          <ChevronDown className="size-4 transition-transform duration-200 ease-out [[data-state=open]_&]:rotate-180" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={14}
          collisionPadding={16}
          className="z-50 w-[min(880px,calc(100vw-32px))] origin-[var(--radix-popover-content-transform-origin)] rounded-[1.25rem] border border-aluminio bg-white p-3 shadow-[var(--shadow-flotante)] data-[state=open]:animate-[subir_200ms_var(--ease-out)]"
        >
          <div className="grid grid-cols-2 gap-1 md:grid-cols-3 lg:grid-cols-4">
            {categorias.map((c) => (
              <Link
                key={c.id}
                href={`/rubro/${c.slug}`}
                onClick={() => setAbierto(false)}
                className="group flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-vidrio"
              >
                <FichaRubro icono={c.icono} color={c.color} tam="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.9rem] font-medium text-tinta group-hover:text-marca-700">{c.nombre}</span>
                  <span className="tabular block text-[0.72rem] text-tinta-3">{formatNumero(c.cantidad)} productos</span>
                </span>
              </Link>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between rounded-xl bg-vidrio px-4 py-3">
            <p className="text-sm text-tinta-2">
              <span className="font-semibold text-tinta">{formatNumero(categorias.reduce((t, c) => t + c.cantidad, 0))}</span> productos en{" "}
              {categorias.length} rubros
            </p>
            <Link href="/catalogo" onClick={() => setAbierto(false)} className="text-sm font-semibold text-marca-700 hover:underline">
              Ver todo el catálogo
            </Link>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function BotonPedido() {
  const { compra_minima } = useTienda();
  const hidratado = useCarritoHidratado();
  const items = useCarrito((s) => s.items);
  const abrir = useCarrito((s) => s.abrir);
  const subtotal = hidratado ? subtotalDe(items) : 0;
  const renglones = hidratado ? items.length : 0;
  const unidades = hidratado ? unidadesDe(items) : 0;
  const insignia = useRef<HTMLSpanElement>(null);

  useEffect(
    () =>
      escucharAgregado(() => {
        insignia.current?.animate(
          [{ transform: "scale(1)" }, { transform: "scale(1.28)" }, { transform: "scale(1)" }],
          { duration: 320, easing: "cubic-bezier(0.23, 1, 0.32, 1)" },
        );
      }),
    [],
  );

  return (
    <button
      type="button"
      onClick={abrir}
      data-destino-carrito
      className="presionable group relative flex h-11 items-center gap-2.5 rounded-xl bg-white/10 pl-2.5 pr-3 text-left text-white ring-1 ring-white/15 transition-colors hover:bg-white/16"
      aria-label={renglones > 0 ? `Tu pedido: ${unidades} unidades, ${formatARS(subtotal)}` : "Tu pedido está vacío"}
    >
      <CajaProgreso progreso={subtotal / compra_minima} sobreOscuro className="size-7" grosor={11} />
      <span className="hidden flex-col leading-tight lg:flex">
        <span className="text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-marca-200">Tu pedido</span>
        <span className="tabular text-[0.95rem] font-bold">{formatARS(subtotal)}</span>
      </span>
      <span
        ref={insignia}
        className={cn(
          "tabular absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-ambar px-1 text-[0.68rem] font-extrabold text-ambar-tinta shadow-[0_2px_6px_rgb(0_0_0/0.25)] transition-opacity",
          renglones === 0 && "opacity-0",
        )}
      >
        {renglones}
      </span>
    </button>
  );
}

/** La ruta llega por prop: así el cartel se prerenderiza también en rutas dinámicas (ver CabeceraConRuta). */
export function Cabecera({ ruta }: { ruta?: string }) {
  const pathname = ruta ?? "";
  const abrirBuscador = useUI((s) => s.abrirBuscador);
  const encendido = useUI((s) => s.encendido);
  const luz = useRef<HTMLSpanElement>(null);
  const local = useEstadoLocal();

  // El cartel "arranca" como un tubo fluorescente: una vez por sesión y al llegar a la compra mínima.
  useEffect(() => {
    let primera = false;
    try {
      primera = !sessionStorage.getItem("shangai-encendido");
      if (primera) sessionStorage.setItem("shangai-encendido", "1");
    } catch {
      /* sin sessionStorage: no pasa nada */
    }
    if (!primera && encendido === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    luz.current?.animate(
      [
        { opacity: 0.25 },
        { opacity: 0.9, offset: 0.06 },
        { opacity: 0.3, offset: 0.09 },
        { opacity: 1, offset: 0.16 },
        { opacity: 0.55, offset: 0.21 },
        { opacity: 1, offset: 0.27 },
        { opacity: 1 },
      ],
      { duration: 1100, easing: "linear" },
    );
  }, [encendido]);

  useEffect(() => {
    const atajo = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        abrirBuscador();
      }
      if (e.key === "/" && !(e.target as HTMLElement)?.closest("input, textarea, [contenteditable]")) {
        e.preventDefault();
        abrirBuscador();
      }
    };
    window.addEventListener("keydown", atajo);
    return () => window.removeEventListener("keydown", atajo);
  }, [abrirBuscador]);

  return (
    <>
      <div className="bg-vidrio">
        <TiraSuperior />
      </div>
      <header className="sticky top-0 z-40 px-2 pt-2 sm:px-3 sm:pt-3">
        <div
          className="cartel mx-auto flex h-14 max-w-[1440px] items-center gap-2 rounded-2xl px-2.5 sm:h-16 sm:gap-3 sm:px-4"
          data-apagado={local ? !local.abierto : false}
        >
          <span ref={luz} className="cartel-luz" />
          <Link href="/" className="flex shrink-0 items-center rounded-xl px-1.5 py-1" aria-label="Shangai Center, ir al inicio">
            <Logotipo conBajada className="[&_svg]:size-7 sm:[&_svg]:size-8" />
          </Link>

          <nav className="ml-3 hidden items-center gap-0.5 lg:flex" aria-label="Secciones">
            <MenuRubrosEscritorio />
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={pathname === n.href ? "page" : undefined}
                className="inline-flex h-10 items-center rounded-xl px-3 text-[0.92rem] font-semibold text-white/90 transition-colors hover:bg-white/10 hover:text-white aria-[current=page]:bg-white/14 aria-[current=page]:text-white"
              >
                {n.texto}
              </Link>
            ))}
          </nav>

          <button
            type="button"
            onClick={abrirBuscador}
            className="group ml-auto hidden h-11 w-full max-w-[420px] items-center gap-3 rounded-xl bg-white px-3.5 text-left text-tinta-3 shadow-[0_1px_0_rgb(255_255_255/0.6)_inset,0_6px_18px_-10px_rgb(0_0_0/0.5)] transition-shadow hover:shadow-[0_0_0_4px_rgb(202_205_237/0.35)] md:flex"
          >
            <Search className="size-[18px] text-marca-500" />
            <span className="flex-1 truncate text-[0.92rem]">Buscá por nombre o código…</span>
            <kbd className="rounded-md border border-aluminio bg-vidrio px-1.5 py-0.5 text-[0.7rem] font-semibold text-tinta-3">⌘K</kbd>
          </button>

          <div className="ml-auto flex items-center gap-1.5 md:ml-0">
            <button
              type="button"
              onClick={abrirBuscador}
              className="presionable grid size-11 place-items-center rounded-xl text-white hover:bg-white/10 md:hidden"
              aria-label="Buscar productos"
            >
              <Search className="size-5" />
            </button>
            <Link
              href="/favoritos"
              className="presionable hidden size-11 place-items-center rounded-xl text-white/90 hover:bg-white/10 hover:text-white sm:grid"
              aria-label="Favoritos"
            >
              <Heart className="size-5" />
            </Link>
            <BotonPedido />
          </div>
        </div>
      </header>
    </>
  );
}

/** Versión que lee la ruta actual (va dentro de <Suspense> en el layout). */
export function CabeceraConRuta() {
  const ruta = usePathname();
  return <Cabecera ruta={ruta} />;
}
