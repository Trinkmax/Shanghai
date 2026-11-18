"use client";

import {
  ClipboardList,
  CreditCard,
  ExternalLink,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Menu,
  Package,
  PanelsTopLeft,
  Settings,
  Store,
  Tag,
  Trophy,
  UserCog,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Drawer } from "vaul";
import { Logotipo } from "@/components/marca/Isotipo";
import { cerrarSesion } from "@/lib/actions/auth";
import type { RolPersonal } from "@/lib/database.types";
import { NOMBRE_ROL, puede, type Permiso } from "@/lib/panel/permisos";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ProveedorConfirmar } from "./Dialogo";

type Item = { href: string; texto: string; icono: LucideIcon; permiso: Permiso; exacto?: boolean; insignia?: boolean };

const GRUPOS: { titulo: string; items: Item[] }[] = [
  {
    titulo: "Ventas",
    items: [
      { href: "/panel", texto: "Resumen", icono: LayoutDashboard, permiso: "ver_resumen", exacto: true },
      { href: "/panel/pedidos", texto: "Pedidos", icono: ClipboardList, permiso: "ver_pedidos", insignia: true },
      { href: "/panel/mostrador", texto: "Mostrador", icono: Store, permiso: "mostrador" },
      { href: "/panel/clientes", texto: "Clientes", icono: Users, permiso: "ver_clientes" },
    ],
  },
  {
    titulo: "Catálogo",
    items: [
      { href: "/panel/productos", texto: "Productos", icono: Package, permiso: "ver_productos" },
      { href: "/panel/rubros", texto: "Rubros", icono: LayoutGrid, permiso: "editar_catalogo" },
      { href: "/panel/ofertas", texto: "Ofertas", icono: Tag, permiso: "editar_catalogo" },
      { href: "/panel/mas-vendidos", texto: "Más vendidos", icono: Trophy, permiso: "editar_catalogo" },
      { href: "/panel/portada", texto: "Portada", icono: PanelsTopLeft, permiso: "editar_portada" },
    ],
  },
  {
    titulo: "Negocio",
    items: [
      { href: "/panel/equipo", texto: "Equipo", icono: UserCog, permiso: "equipo" },
      { href: "/panel/ajustes", texto: "Ajustes", icono: Settings, permiso: "ajustes", exacto: true },
      { href: "/panel/ajustes/mercado-pago", texto: "Mercado Pago", icono: CreditCard, permiso: "mercadopago_ver" },
    ],
  },
];

function activo(pathname: string, it: Item) {
  return it.exacto ? pathname === it.href : pathname === it.href || pathname.startsWith(`${it.href}/`);
}

function Navegacion({
  rol,
  pendientes,
  onNavegar,
  oscuro = true,
}: {
  rol: RolPersonal;
  pendientes: number;
  onNavegar?: () => void;
  oscuro?: boolean;
}) {
  const pathname = usePathname();
  return (
    <nav aria-label="Panel" className="flex flex-col gap-5">
      {GRUPOS.map((g) => {
        const items = g.items.filter((i) => puede(rol, i.permiso));
        if (items.length === 0) return null;
        return (
          <div key={g.titulo}>
            <p className={cn("mb-1.5 px-3 text-[0.7rem] font-semibold uppercase tracking-[0.08em]", oscuro ? "text-marca-200/80" : "text-tinta-3")}>
              {g.titulo}
            </p>
            <ul className="flex flex-col gap-0.5">
              {items.map((it) => {
                const a = activo(pathname, it);
                const Icono = it.icono;
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      onClick={onNavegar}
                      aria-current={a ? "page" : undefined}
                      className={cn(
                        "group flex h-10 items-center gap-3 rounded-xl px-3 text-[0.92rem] font-medium transition-colors duration-150",
                        oscuro
                          ? "text-marca-50/90 hover:bg-white/10 hover:text-white aria-[current=page]:bg-white aria-[current=page]:text-marca-800 aria-[current=page]:shadow-[0_6px_16px_-8px_rgb(0_0_0/0.5)]"
                          : "text-tinta-2 hover:bg-vidrio aria-[current=page]:bg-marca-50 aria-[current=page]:text-marca-800",
                      )}
                    >
                      <Icono className="size-[18px] shrink-0" strokeWidth={2} />
                      <span className="flex-1 truncate">{it.texto}</span>
                      {it.insignia && pendientes > 0 && (
                        <span className="tabular grid h-5 min-w-5 place-items-center rounded-full bg-ambar px-1.5 text-[0.7rem] font-extrabold text-ambar-tinta">
                          {pendientes > 99 ? "99+" : pendientes}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

function Usuario({ nombre, rol, oscuro = true }: { nombre: string; rol: RolPersonal; oscuro?: boolean }) {
  const [saliendo, empezar] = useTransition();
  const iniciales = nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <div className={cn("flex items-center gap-3 rounded-2xl p-2.5", oscuro ? "bg-white/8 ring-1 ring-white/10" : "bg-vidrio")}>
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl text-sm font-bold", oscuro ? "bg-white text-marca-800" : "bg-marca-700 text-white")}>
        {iniciales || "?"}
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className={cn("block truncate text-[0.88rem] font-semibold", oscuro ? "text-white" : "text-tinta")}>{nombre}</span>
        <span className={cn("block text-[0.75rem]", oscuro ? "text-marca-200" : "text-tinta-3")}>{NOMBRE_ROL[rol]}</span>
      </span>
      <button
        type="button"
        onClick={() => empezar(() => cerrarSesion())}
        disabled={saliendo}
        className={cn(
          "grid size-9 place-items-center rounded-xl transition-colors disabled:opacity-50",
          oscuro ? "text-marca-100 hover:bg-white/12 hover:text-white" : "text-tinta-2 hover:bg-white",
        )}
        aria-label="Cerrar sesión"
        title="Cerrar sesión"
      >
        <LogOut className="size-[18px]" />
      </button>
    </div>
  );
}

/** Pedidos nuevos en vivo (Realtime respeta RLS: solo el equipo los recibe). */
function usePedidosEnVivo(inicial: number) {
  const [pendientes, setPendientes] = useState(inicial);
  const router = useRouter();
  const pathname = usePathname();
  const ruta = useRef(pathname);
  useEffect(() => {
    ruta.current = pathname;
  }, [pathname]);

  const [inicialPrevio, setInicialPrevio] = useState(inicial);
  if (inicial !== inicialPrevio) {
    setInicialPrevio(inicial);
    setPendientes(inicial);
  }

  const recontar = useCallback(async () => {
    const sb = createClient();
    const { count } = await sb
      .from("pedidos")
      .select("id", { count: "exact", head: true })
      .in("estado", ["pendiente", "confirmado", "preparando", "listo"])
      .neq("canal", "mostrador");
    if (count != null) setPendientes(count);
  }, []);

  useEffect(() => {
    const sb = createClient();
    let temporizador: ReturnType<typeof setTimeout> | undefined;
    const canal = sb
      .channel("shangai-pedidos-panel")
      .on("postgres_changes", { event: "INSERT", schema: "shangai", table: "pedidos" }, (payload) => {
        const p = payload.new as { numero: number; cliente_nombre: string; canal: string };
        if (p.canal !== "mostrador") {
          toast(`Nuevo pedido #${p.numero}`, {
            description: `${p.cliente_nombre} acaba de hacer un pedido en la tienda.`,
            action: { label: "Ver", onClick: () => router.push(`/panel/pedidos/${p.numero}`) },
            duration: 10000,
          });
        }
        clearTimeout(temporizador);
        temporizador = setTimeout(() => {
          void recontar();
          if (ruta.current === "/panel" || ruta.current.startsWith("/panel/pedidos")) router.refresh();
        }, 1200);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "shangai", table: "pedidos" }, () => {
        clearTimeout(temporizador);
        temporizador = setTimeout(() => void recontar(), 1500);
      })
      .subscribe();
    return () => {
      clearTimeout(temporizador);
      void sb.removeChannel(canal);
    };
  }, [recontar, router]);

  return pendientes;
}

export function Armazon({
  nombre,
  rol,
  pendientesIniciales,
  children,
}: {
  nombre: string;
  rol: RolPersonal;
  pendientesIniciales: number;
  children: React.ReactNode;
}) {
  const pendientes = usePedidosEnVivo(pendientesIniciales);
  const [menu, setMenu] = useState(false);
  const pathname = usePathname();
  const [rutaPrevia, setRutaPrevia] = useState(pathname);
  if (pathname !== rutaPrevia) {
    setRutaPrevia(pathname);
    setMenu(false);
  }

  const rapidos = useMemo(
    () =>
      GRUPOS.flatMap((g) => g.items)
        .filter((i) => puede(rol, i.permiso))
        .filter((i) => ["/panel", "/panel/pedidos", "/panel/mostrador", "/panel/productos", "/panel/clientes"].includes(i.href))
        .slice(0, 4),
    [rol],
  );

  return (
    <ProveedorConfirmar>
      <div className="min-h-dvh bg-vidrio lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
        {/* Barra lateral: el cartel del local */}
        <aside className="sticky top-0 hidden h-dvh p-2.5 lg:block">
          <div className="cartel flex h-full flex-col rounded-[1.5rem] p-3">
            <span className="cartel-luz" />
            <Link href="/panel" className="flex items-center rounded-xl px-2 pb-5 pt-2" aria-label="Inicio del panel">
              <Logotipo conBajada className="[&_svg]:size-8" />
            </Link>
            <div className="sin-scrollbar min-h-0 flex-1 overflow-y-auto pr-0.5">
              <Navegacion rol={rol} pendientes={pendientes} />
            </div>
            <div className="mt-3 space-y-2">
              <a
                href="/"
                target="_blank"
                rel="noreferrer"
                className="flex h-10 items-center gap-3 rounded-xl px-3 text-[0.88rem] font-medium text-marca-100 hover:bg-white/10 hover:text-white"
              >
                <ExternalLink className="size-4" /> Ver la tienda
              </a>
              <Usuario nombre={nombre} rol={rol} />
            </div>
          </div>
        </aside>

        {/* Celular: cartel compacto arriba + barra inferior */}
        <header className="sticky top-0 z-30 px-2 pt-2 lg:hidden">
          <div className="cartel flex h-14 items-center justify-between rounded-2xl px-2.5">
            <span className="cartel-luz" />
            <Link href="/panel" className="flex items-center rounded-xl px-1.5" aria-label="Inicio del panel">
              <Logotipo className="[&_svg]:size-7" />
            </Link>
            <button
              type="button"
              onClick={() => setMenu(true)}
              className="presionable relative grid size-11 place-items-center rounded-xl text-white hover:bg-white/10"
              aria-label="Abrir menú"
            >
              <Menu className="size-5" />
              {pendientes > 0 && <span className="absolute right-2 top-2 size-2.5 rounded-full bg-ambar ring-2 ring-marca-700" />}
            </button>
          </div>
        </header>

        <main className="min-w-0 px-3 pb-28 pt-4 sm:px-5 lg:px-8 lg:pb-10 lg:pt-7">{children}</main>

        <nav
          aria-label="Accesos rápidos"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-aluminio bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
        >
          <div className="mx-auto flex h-16 max-w-xl">
            {rapidos.map((it) => {
              const a = activo(pathname, it);
              const Icono = it.icono;
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  aria-current={a ? "page" : undefined}
                  className="relative flex flex-1 flex-col items-center justify-center gap-1 text-[0.68rem] font-semibold text-tinta-3 aria-[current=page]:text-marca-700"
                >
                  <Icono className="size-[22px]" />
                  {it.texto}
                  {it.insignia && pendientes > 0 && (
                    <span className="tabular absolute left-1/2 top-1.5 ml-2 grid h-4 min-w-4 place-items-center rounded-full bg-ambar px-1 text-[0.62rem] font-extrabold text-ambar-tinta">
                      {pendientes}
                    </span>
                  )}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => setMenu(true)}
              className="flex flex-1 flex-col items-center justify-center gap-1 text-[0.68rem] font-semibold text-tinta-3"
            >
              <Menu className="size-[22px]" /> Más
            </button>
          </div>
        </nav>

        <Drawer.Root open={menu} onOpenChange={setMenu}>
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 z-50 bg-tinta/40" />
            <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col rounded-t-[1.75rem] bg-white outline-none" aria-describedby={undefined}>
              <Drawer.Handle className="!mt-2.5 !h-1.5 !w-12 !bg-aluminio-2" />
              <div className="flex items-center justify-between px-5 pb-2 pt-3">
                <Drawer.Title className="text-lg font-bold text-tinta">Panel</Drawer.Title>
                <Drawer.Close className="grid size-10 place-items-center rounded-xl text-tinta-2 hover:bg-vidrio" aria-label="Cerrar">
                  <X className="size-5" />
                </Drawer.Close>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4" data-vaul-no-drag>
                <Navegacion rol={rol} pendientes={pendientes} oscuro={false} onNavegar={() => setMenu(false)} />
              </div>
              <div className="border-t border-aluminio px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
                <Usuario nombre={nombre} rol={rol} oscuro={false} />
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      </div>
    </ProveedorConfirmar>
  );
}
