"use client";

import { Check, Pencil, Star, Tag, Trophy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Boton } from "@/components/ui/Boton";
import { ImagenProducto } from "@/components/ui/ImagenProducto";
import { accionMasiva, actualizarRapido } from "@/lib/actions/productos";
import { formatARS } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Casilla, Interruptor } from "../formulario";

export type FilaProducto = {
  id: string;
  codigo: string;
  slug: string;
  nombre: string;
  precio: number;
  precio_oferta: number | null;
  en_oferta: boolean;
  stock: number | null;
  activo: boolean;
  es_novedad: boolean;
  destacado: boolean;
  imagenes: string[];
  categoria_id: number | null;
  ranking_vendidos: number | null;
};

type Rubro = { id: number; nombre: string };

/** Celda editable: muestra el valor; al tocar, input; Enter/blur guarda. */
function CeldaEditable({
  valor,
  formato,
  onGuardar,
  ancho = "w-28",
  etiqueta,
  permitirVacio = false,
  disabled,
}: {
  valor: number | null;
  formato: (n: number | null) => string;
  onGuardar: (n: number | null) => Promise<boolean>;
  ancho?: string;
  etiqueta: string;
  permitirVacio?: boolean;
  disabled?: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState("");
  const [ok, setOk] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function guardar() {
    setEditando(false);
    const limpio = texto.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
    const n = limpio === "" ? null : Number(limpio);
    if (n === valor || (n === null && !permitirVacio) || (n !== null && !Number.isFinite(n))) return;
    if (await onGuardar(n)) {
      setOk(true);
      setTimeout(() => setOk(false), 1200);
    }
  }

  if (disabled) return <span className={cn("tabular inline-block text-right text-[0.92rem] text-tinta", ancho)}>{formato(valor)}</span>;

  return editando ? (
    <input
      ref={input}
      autoFocus
      value={texto}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={guardar}
      onKeyDown={(e) => {
        if (e.key === "Enter") input.current?.blur();
        if (e.key === "Escape") setEditando(false);
      }}
      inputMode="decimal"
      aria-label={etiqueta}
      className={cn("campo tabular h-9 px-2 text-right text-[0.92rem]", ancho)}
    />
  ) : (
    <button
      type="button"
      onClick={() => {
        setTexto(valor == null ? "" : String(valor));
        setEditando(true);
      }}
      className={cn(
        "group tabular inline-flex h-9 items-center justify-end gap-1.5 rounded-lg px-2 text-right text-[0.92rem] text-tinta hover:bg-vidrio",
        ancho,
      )}
      aria-label={`${etiqueta}: ${formato(valor)}. Tocá para editar`}
    >
      {ok ? <Check className="size-3.5 text-verde" /> : <Pencil className="size-3 text-tinta-3 opacity-0 transition-opacity group-hover:opacity-100" />}
      {formato(valor)}
    </button>
  );
}

export function TablaProductos({ filas, rubros, editable }: { filas: FilaProducto[]; rubros: Rubro[]; editable: boolean }) {
  const router = useRouter();
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [optimistas, aplicar] = useOptimistic(filas, (estado, cambio: { id: string } & Partial<FilaProducto>) =>
    estado.map((f) => (f.id === cambio.id ? { ...f, ...cambio } : f)),
  );
  const [pendiente, empezar] = useTransition();
  const [moverA, setMoverA] = useState("");
  const nombreRubro = new Map(rubros.map((r) => [r.id, r.nombre]));

  const todos = filas.length > 0 && seleccion.size === filas.length;
  const alguno = seleccion.size > 0 && !todos;

  async function rapido(id: string, cambios: { precio?: number; stock?: number | null; activo?: boolean }) {
    let exito = false;
    await new Promise<void>((resolver) =>
      empezar(async () => {
        aplicar({ id, ...cambios });
        const r = await actualizarRapido({ id, ...cambios });
        if (!r.ok) toast.error(r.error);
        else exito = true;
        router.refresh();
        resolver();
      }),
    );
    return exito;
  }

  function masiva(accion: Parameters<typeof accionMasiva>[0]["accion"], categoria_id?: number | null) {
    const ids = [...seleccion];
    empezar(async () => {
      const r = await accionMasiva({ ids, accion, categoria_id });
      if (r.ok) {
        toast.success(`Listo: ${r.data.cantidad} producto${r.data.cantidad === 1 ? "" : "s"} actualizado${r.data.cantidad === 1 ? "" : "s"}`);
        setSeleccion(new Set());
        setMoverA("");
      } else toast.error(r.error);
    });
  }

  const alternar = (id: string) =>
    setSeleccion((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <>
      <div className="overflow-hidden rounded-[var(--radius-pane)] border border-aluminio bg-white">
        <div className="hidden items-center gap-3 border-b border-aluminio bg-vidrio/60 px-4 py-2.5 text-[0.76rem] font-semibold uppercase tracking-[0.06em] text-tinta-3 md:flex">
          {editable && (
            <Casilla
              marcada={todos ? true : alguno ? "indeterminate" : false}
              onCambiar={(v) => setSeleccion(v ? new Set(filas.map((f) => f.id)) : new Set())}
              etiqueta="Seleccionar todos"
            />
          )}
          <span className="w-12" />
          <span className="flex-1">Producto</span>
          <span className="hidden w-40 lg:block">Rubro</span>
          <span className="w-28 text-right">Precio</span>
          <span className="w-20 text-right">Stock</span>
          <span className="w-16 text-center">Activo</span>
          <span className="w-9" />
        </div>
        <ul className="divide-y divide-aluminio">
          {optimistas.map((f) => (
            <li
              key={f.id}
              className={cn(
                "flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 md:flex-nowrap",
                seleccion.has(f.id) && "bg-marca-50/70",
                !f.activo && "bg-vidrio/50",
              )}
            >
              {editable && <Casilla marcada={seleccion.has(f.id)} onCambiar={() => alternar(f.id)} etiqueta={`Seleccionar ${f.nombre}`} />}
              <ImagenProducto ruta={f.imagenes[0]} alt="" tam="xs" className={cn("size-12 shrink-0 rounded-lg border border-aluminio", !f.activo && "opacity-50")} />
              <div className="min-w-0 flex-1 basis-[calc(100%-8rem)] md:basis-auto">
                <Link href={`/panel/productos/${f.id}`} className={cn("line-clamp-2 text-[0.92rem] font-medium leading-snug text-tinta hover:underline", !f.activo && "text-tinta-2")}>
                  {f.nombre}
                </Link>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.76rem] text-tinta-3">
                  <span className="tabular">Cód. {f.codigo}</span>
                  <span className="lg:hidden">· {f.categoria_id ? nombreRubro.get(f.categoria_id) ?? "—" : "Sin rubro"}</span>
                  {(f.en_oferta || f.precio_oferta != null) && (
                    <span className="inline-flex items-center gap-1 font-semibold text-ambar-tinta">
                      <Tag className="size-3" /> {f.precio_oferta != null ? formatARS(f.precio_oferta) : "Oferta"}
                    </span>
                  )}
                  {f.es_novedad && <span className="font-semibold text-marca-600">Nuevo</span>}
                  {f.destacado && (
                    <span className="inline-flex items-center gap-1 font-semibold text-marca-600">
                      <Star className="size-3" /> Vidriera
                    </span>
                  )}
                  {f.ranking_vendidos != null && (
                    <span className="inline-flex items-center gap-1 font-semibold text-marca-600">
                      <Trophy className="size-3" /> Nº {f.ranking_vendidos}
                    </span>
                  )}
                  {!f.activo && <span className="font-semibold text-tinta-2">Oculto</span>}
                </p>
              </div>
              <span className="hidden w-40 truncate text-[0.88rem] text-tinta-2 lg:block">
                {f.categoria_id ? nombreRubro.get(f.categoria_id) ?? "—" : "Sin rubro"}
              </span>
              <div className="ml-auto flex items-center gap-1 md:ml-0">
                <CeldaEditable
                  valor={f.precio}
                  formato={(n) => formatARS(n ?? 0)}
                  etiqueta={`Precio de ${f.nombre}`}
                  disabled={!editable}
                  onGuardar={async (n) => (n != null && n > 0 ? rapido(f.id, { precio: n }) : (toast.error("El precio tiene que ser mayor a 0."), false))}
                />
                <CeldaEditable
                  valor={f.stock}
                  ancho="w-20"
                  formato={(n) => (n == null ? "—" : `${n} u.`)}
                  etiqueta={`Stock de ${f.nombre} (vacío = no se controla)`}
                  permitirVacio
                  disabled={!editable}
                  onGuardar={(n) => rapido(f.id, { stock: n == null ? null : Math.max(0, Math.round(n)) })}
                />
              </div>
              <span className="flex w-16 justify-center">
                <Interruptor
                  compacto
                  etiqueta={`Mostrar ${f.nombre} en la tienda`}
                  activo={f.activo}
                  disabled={!editable}
                  onCambiar={(v) => void rapido(f.id, { activo: v })}
                />
              </span>
              <Link
                href={`/panel/productos/${f.id}`}
                className="hidden size-9 place-items-center rounded-lg text-tinta-3 hover:bg-vidrio hover:text-tinta md:grid"
                aria-label={`Editar ${f.nombre}`}
              >
                <Pencil className="size-4" />
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {editable && seleccion.size > 0 && (
        <div className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-4xl rounded-2xl border border-aluminio bg-white p-3 shadow-[var(--shadow-flotante)] entrar lg:bottom-6 lg:left-[calc(264px+2rem)]">
          <div className="flex flex-wrap items-center gap-2">
            <p className="tabular mr-auto pl-1 text-[0.92rem] font-semibold text-tinta">
              {seleccion.size} seleccionado{seleccion.size === 1 ? "" : "s"}
            </p>
            <Boton tam="sm" variante="claro" cargando={pendiente} onClick={() => masiva("activar")}>
              Mostrar
            </Boton>
            <Boton tam="sm" variante="claro" disabled={pendiente} onClick={() => masiva("desactivar")}>
              Ocultar
            </Boton>
            <Boton tam="sm" variante="claro" disabled={pendiente} onClick={() => masiva("novedad")}>
              Marcar nuevo
            </Boton>
            <Boton tam="sm" variante="claro" disabled={pendiente} onClick={() => masiva("quitar_novedad")}>
              Quitar nuevo
            </Boton>
            <label className="sr-only" htmlFor="mover-rubro">
              Mover a rubro
            </label>
            <select
              id="mover-rubro"
              value={moverA}
              onChange={(e) => setMoverA(e.target.value)}
              className="campo h-9 w-44 rounded-xl px-2.5 text-sm"
            >
              <option value="">Mover a rubro…</option>
              {rubros.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre}
                </option>
              ))}
            </select>
            {moverA && (
              <Boton tam="sm" disabled={pendiente} onClick={() => masiva("mover", Number(moverA))}>
                Mover
              </Boton>
            )}
            <button type="button" onClick={() => setSeleccion(new Set())} className="rounded-lg px-2 py-1.5 text-sm font-medium text-tinta-3 hover:text-tinta">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
