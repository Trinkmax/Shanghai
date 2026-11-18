import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { CanalPedido, EstadoPago, EstadoPedido } from "@/lib/database.types";
import { TEXTO_ESTADO, TEXTO_PAGO } from "@/lib/tienda";
import { cn } from "@/lib/utils";

/** Encabezado de página del panel: título + bajada + acciones a la derecha. */
export function TituloPagina({
  titulo,
  descripcion,
  acciones,
  volver,
  className,
}: {
  titulo: React.ReactNode;
  descripcion?: React.ReactNode;
  acciones?: React.ReactNode;
  volver?: { href: string; texto: string };
  className?: string;
}) {
  return (
    <header className={cn("mb-5 flex flex-col gap-3 sm:mb-7 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {volver && (
          <Link
            href={volver.href}
            className="mb-2 inline-flex items-center gap-1 rounded-lg py-1 pr-2 text-sm font-medium text-tinta-3 hover:text-marca-700"
          >
            <ChevronLeft className="size-4" />
            {volver.texto}
          </Link>
        )}
        <h1 className="text-[1.6rem] font-bold leading-tight tracking-[-0.01em] text-tinta sm:text-[1.85rem]">{titulo}</h1>
        {descripcion && <p className="mt-1.5 max-w-[70ch] text-[0.95rem] text-tinta-2">{descripcion}</p>}
      </div>
      {acciones && <div className="flex shrink-0 flex-wrap items-center gap-2">{acciones}</div>}
    </header>
  );
}

/** Paño blanco con perfil de aluminio. */
export function Tarjeta({
  titulo,
  descripcion,
  accion,
  children,
  className,
  cuerpo = true,
}: {
  titulo?: React.ReactNode;
  descripcion?: React.ReactNode;
  accion?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  cuerpo?: boolean;
}) {
  return (
    <section className={cn("rounded-[var(--radius-pane)] border border-aluminio bg-white", className)}>
      {(titulo || accion) && (
        <div className="flex items-start justify-between gap-3 border-b border-aluminio px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            {titulo && <h2 className="text-[1rem] font-semibold text-tinta">{titulo}</h2>}
            {descripcion && <p className="mt-0.5 text-[0.85rem] text-tinta-3">{descripcion}</p>}
          </div>
          {accion && <div className="shrink-0">{accion}</div>}
        </div>
      )}
      {cuerpo ? <div className="p-4 sm:p-5">{children}</div> : children}
    </section>
  );
}

const CLASE_ESTADO: Record<EstadoPedido, string> = {
  pendiente: "vinilo-ambar",
  confirmado: "vinilo-marca",
  preparando: "bg-[#2a7fcb] text-white",
  listo: "bg-[#0f8c89] text-white",
  enviado: "bg-[#7446bc] text-white",
  entregado: "bg-verde text-white",
  cancelado: "vinilo-tinta",
};

export function ChipEstado({ estado, className }: { estado: EstadoPedido; className?: string }) {
  return <span className={cn("vinilo", CLASE_ESTADO[estado], className)}>{TEXTO_ESTADO[estado]}</span>;
}

const CLASE_PAGO: Record<EstadoPago, string> = {
  pendiente: "border border-ambar-2/60 bg-[#fff7dc] text-ambar-tinta shadow-none",
  en_proceso: "border border-[#2a7fcb]/40 bg-[#e5f0fb] text-[#1a5a96] shadow-none",
  aprobado: "border border-verde/30 bg-[#e2f4ea] text-verde shadow-none",
  rechazado: "border border-rojo/30 bg-[#fbe5e5] text-rojo shadow-none",
  reembolsado: "border border-aluminio-2 bg-vidrio text-tinta-2 shadow-none",
  cancelado: "border border-aluminio-2 bg-vidrio text-tinta-2 shadow-none",
};

export function ChipPago({ estado, className }: { estado: EstadoPago; className?: string }) {
  return <span className={cn("vinilo", CLASE_PAGO[estado], className)}>{TEXTO_PAGO[estado]}</span>;
}

export function ChipCanal({ canal }: { canal: CanalPedido }) {
  const t = canal === "web" ? "Web" : canal === "mostrador" ? "Mostrador" : "WhatsApp";
  return <span className="vinilo border border-aluminio bg-white text-tinta-2 shadow-none">{t}</span>;
}

export function EstadoVacio({
  icono,
  titulo,
  texto,
  accion,
  className,
}: {
  icono?: React.ReactNode;
  titulo: string;
  texto?: React.ReactNode;
  accion?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-14 text-center", className)}>
      {icono && <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-vidrio text-tinta-3 [&_svg]:size-7">{icono}</div>}
      <p className="text-[1.05rem] font-semibold text-tinta">{titulo}</p>
      {texto && <p className="mt-1.5 max-w-[46ch] text-[0.93rem] text-tinta-2">{texto}</p>}
      {accion && <div className="mt-5">{accion}</div>}
    </div>
  );
}

/** Paginador por URL (conserva los demás filtros). */
export function Paginador({
  pagina,
  total,
  porPagina,
  base,
  params,
}: {
  pagina: number;
  total: number;
  porPagina: number;
  base: string;
  params: Record<string, string | undefined>;
}) {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  if (paginas <= 1) return null;
  const href = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    if (p > 1) q.set("pagina", String(p));
    else q.delete("pagina");
    const s = q.toString();
    return s ? `${base}?${s}` : base;
  };
  const desde = (pagina - 1) * porPagina + 1;
  const hasta = Math.min(total, pagina * porPagina);
  const boton =
    "inline-flex h-9 items-center gap-1 rounded-xl border border-aluminio-2 bg-white px-3 text-sm font-medium text-tinta hover:border-tinta-3 aria-disabled:pointer-events-none aria-disabled:opacity-40";
  return (
    <nav className="mt-4 flex items-center justify-between gap-3" aria-label="Paginación">
      <p className="tabular text-sm text-tinta-3">
        {desde}–{hasta} de {total.toLocaleString("es-AR")}
      </p>
      <div className="flex items-center gap-2">
        <Link href={href(pagina - 1)} aria-disabled={pagina <= 1} className={boton}>
          <ChevronLeft className="size-4" /> Anterior
        </Link>
        <span className="tabular px-1 text-sm text-tinta-2">
          {pagina} / {paginas}
        </span>
        <Link href={href(pagina + 1)} aria-disabled={pagina >= paginas} className={boton}>
          Siguiente <ChevronRight className="size-4" />
        </Link>
      </div>
    </nav>
  );
}

/** Dato del tablero: número grande tabular + etiqueta + comparación opcional. */
export function Dato({
  etiqueta,
  valor,
  detalle,
  className,
}: {
  etiqueta: string;
  valor: React.ReactNode;
  detalle?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 p-4 sm:p-5", className)}>
      <p className="text-[0.82rem] font-medium text-tinta-3">{etiqueta}</p>
      <p className="tabular mt-1.5 truncate text-[1.6rem] font-bold leading-none tracking-[-0.02em] text-tinta sm:text-[1.85rem]">
        {valor}
      </p>
      {detalle && <p className="mt-2 text-[0.8rem] text-tinta-3">{detalle}</p>}
    </div>
  );
}

/** Pestañas por URL (filtros de listas). */
export function PestanasURL({
  opciones,
  activa,
  className,
}: {
  opciones: { id: string; texto: string; href: string; cantidad?: number }[];
  activa: string;
  className?: string;
}) {
  return (
    <nav className={cn("sin-scrollbar -mx-3 flex gap-1 overflow-x-auto px-3 sm:mx-0 sm:px-0", className)} aria-label="Filtros">
      {opciones.map((o) => (
        <Link
          key={o.id}
          href={o.href}
          aria-current={o.id === activa ? "page" : undefined}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-tinta-2 transition-colors hover:bg-white hover:text-tinta aria-[current=page]:bg-white aria-[current=page]:text-tinta aria-[current=page]:shadow-[0_0_0_1px_var(--color-aluminio),0_1px_2px_rgb(22_20_44/0.06)]"
        >
          {o.texto}
          {o.cantidad != null && (
            <span className="tabular rounded-md bg-vidrio-2 px-1.5 py-0.5 text-[0.72rem] font-semibold text-tinta-2">{o.cantidad}</span>
          )}
        </Link>
      ))}
    </nav>
  );
}
