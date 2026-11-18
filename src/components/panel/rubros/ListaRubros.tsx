"use client";

import { ArrowDown, ArrowUp, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Boton } from "@/components/ui/Boton";
import { FichaRubro, ICONOS_RUBRO, IconoRubro } from "@/components/ui/IconoRubro";
import { eliminarRubro, guardarRubro, reordenarRubros } from "@/lib/actions/rubros";
import { formatNumero } from "@/lib/format";
import { ACRILICOS } from "@/lib/tienda";
import { cn } from "@/lib/utils";
import { Dialogo, useConfirmar } from "../Dialogo";
import { AreaTexto, Campo, Interruptor } from "../formulario";

export type Rubro = {
  id: number;
  slug: string;
  nombre: string;
  descripcion: string | null;
  icono: string;
  color: string;
  activa: boolean;
  cantidad: number;
};

type Edicion = Omit<Rubro, "id" | "slug" | "cantidad"> & { id?: number };

const NUEVO: Edicion = { nombre: "", descripcion: null, icono: "Package", color: "indigo", activa: true };

function EditorRubro({ abierto, onCerrar, inicial }: { abierto: boolean; onCerrar: () => void; inicial: Edicion }) {
  const [r, setR] = useState<Edicion>(inicial);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, empezar] = useTransition();

  return (
    <Dialogo
      abierto={abierto}
      onCambiar={(v) => !v && onCerrar()}
      titulo={inicial.id ? "Editar rubro" : "Nuevo rubro"}
      ancho="max-w-xl"
      pie={
        <>
          <Boton variante="claro" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton
            cargando={pendiente}
            onClick={() =>
              empezar(async () => {
                setError(null);
                const res = await guardarRubro(r);
                if (!res.ok) return setError(res.error);
                toast.success(inicial.id ? "Rubro actualizado" : "Rubro creado");
                onCerrar();
              })
            }
          >
            Guardar
          </Boton>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-4 rounded-2xl bg-vidrio p-4">
          <FichaRubro icono={r.icono} color={r.color} tam="lg" />
          <div className="min-w-0">
            <p className="truncate text-[1.05rem] font-semibold text-tinta">{r.nombre || "Nombre del rubro"}</p>
            <p className="text-[0.82rem] text-tinta-3">Así se ve el letrero en la tienda.</p>
          </div>
        </div>
        <Campo etiqueta="Nombre" value={r.nombre} onChange={(e) => setR({ ...r, nombre: e.target.value })} maxLength={60} autoFocus error={error} />
        <AreaTexto
          etiqueta="Descripción (opcional)"
          rows={2}
          value={r.descripcion ?? ""}
          onChange={(e) => setR({ ...r, descripcion: e.target.value || null })}
          maxLength={400}
        />
        <fieldset>
          <legend className="mb-2 text-[0.88rem] font-medium text-tinta">Ícono</legend>
          <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-12">
            {Object.keys(ICONOS_RUBRO).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setR({ ...r, icono: k })}
                aria-pressed={r.icono === k}
                aria-label={k}
                title={k}
                className="grid aspect-square place-items-center rounded-lg border border-aluminio text-tinta-2 hover:border-marca-400 hover:text-marca-700 aria-pressed:border-marca-600 aria-pressed:bg-marca-50 aria-pressed:text-marca-700 [&_svg]:size-[18px]"
              >
                <IconoRubro icono={k} />
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-[0.88rem] font-medium text-tinta">Color del letrero</legend>
          <div className="flex flex-wrap gap-2">
            {Object.entries(ACRILICOS).map(([k, a]) => (
              <button
                key={k}
                type="button"
                onClick={() => setR({ ...r, color: k })}
                aria-pressed={r.color === k}
                aria-label={k}
                title={k}
                className="size-9 rounded-xl ring-offset-2 transition-shadow aria-pressed:ring-2 aria-pressed:ring-tinta"
                style={{ background: a.fondo }}
              />
            ))}
          </div>
        </fieldset>
        <Interruptor etiqueta="Visible en la tienda" activo={r.activa} onCambiar={(v) => setR({ ...r, activa: v })} />
      </div>
    </Dialogo>
  );
}

export function ListaRubros({ rubros }: { rubros: Rubro[] }) {
  const [orden, setOrden] = useState(rubros);
  const [editando, setEditando] = useState<Edicion | null>(null);
  const [pendiente, empezar] = useTransition();
  const confirmar = useConfirmar();
  const [clave, setClave] = useState(0);

  // Si cambian del servidor (después de guardar), se toma el orden nuevo.
  const firma = rubros.map((r) => `${r.id}:${r.nombre}:${r.activa}:${r.icono}:${r.color}:${r.cantidad}`).join("|");
  const [firmaVista, setFirmaVista] = useState(firma);
  if (firma !== firmaVista) {
    setFirmaVista(firma);
    setOrden(rubros);
  }

  function mover(i: number, d: -1 | 1) {
    const j = i + d;
    if (j < 0 || j >= orden.length) return;
    const l = [...orden];
    [l[i], l[j]] = [l[j], l[i]];
    setOrden(l);
    empezar(async () => {
      const r = await reordenarRubros(l.map((x) => x.id));
      if (!r.ok) {
        toast.error(r.error);
        setOrden(rubros);
      }
    });
  }

  async function borrar(r: Rubro) {
    const ok = await confirmar({
      titulo: `¿Borrar “${r.nombre}”?`,
      descripcion: r.cantidad > 0 ? `Tiene ${r.cantidad} productos: primero movelos a otro rubro.` : "El rubro no tiene productos. Se borra para siempre.",
      confirmar: "Borrar",
      peligro: true,
    });
    if (!ok) return;
    const res = await eliminarRubro(r.id);
    if (res.ok) toast.success("Rubro borrado");
    else toast.error(res.error);
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Boton
          onClick={() => {
            setClave((k) => k + 1);
            setEditando(NUEVO);
          }}
        >
          <Plus className="size-4" /> Nuevo rubro
        </Boton>
      </div>
      <ul className={cn("divide-y divide-aluminio overflow-hidden rounded-[var(--radius-pane)] border border-aluminio bg-white", pendiente && "opacity-90")}>
        {orden.map((r, i) => (
          <li key={r.id} className={cn("flex items-center gap-3 px-3 py-2.5 sm:px-4", !r.activa && "bg-vidrio/60")}>
            <div className="flex flex-col">
              <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} className="grid size-7 place-items-center rounded-md text-tinta-3 hover:bg-vidrio hover:text-tinta disabled:opacity-30" aria-label={`Subir ${r.nombre}`}>
                <ArrowUp className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => mover(i, 1)}
                disabled={i === orden.length - 1}
                className="grid size-7 place-items-center rounded-md text-tinta-3 hover:bg-vidrio hover:text-tinta disabled:opacity-30"
                aria-label={`Bajar ${r.nombre}`}
              >
                <ArrowDown className="size-3.5" />
              </button>
            </div>
            <span className="tabular w-6 text-center text-sm text-tinta-3">{i + 1}</span>
            <FichaRubro icono={r.icono} color={r.color} tam="sm" className={cn(!r.activa && "opacity-50 grayscale")} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.95rem] font-medium text-tinta">{r.nombre}</p>
              <p className="tabular text-[0.78rem] text-tinta-3">
                {formatNumero(r.cantidad)} productos{!r.activa && " · oculto en la tienda"}
              </p>
            </div>
            <Link href={`/panel/productos?rubro=${r.id}`} className="hidden rounded-lg px-2.5 py-1.5 text-sm font-medium text-marca-700 hover:bg-marca-50 sm:inline-block">
              Ver productos
            </Link>
            <a href={`/rubro/${r.slug}`} target="_blank" rel="noreferrer" className="grid size-9 place-items-center rounded-lg text-tinta-3 hover:bg-vidrio hover:text-tinta" aria-label={`Ver ${r.nombre} en la tienda`}>
              <ExternalLink className="size-4" />
            </a>
            <button
              type="button"
              onClick={() => {
                setClave((k) => k + 1);
                setEditando({ id: r.id, nombre: r.nombre, descripcion: r.descripcion, icono: r.icono, color: r.color, activa: r.activa });
              }}
              className="grid size-9 place-items-center rounded-lg text-tinta-3 hover:bg-vidrio hover:text-tinta"
              aria-label={`Editar ${r.nombre}`}
            >
              <Pencil className="size-4" />
            </button>
            <button type="button" onClick={() => void borrar(r)} className="grid size-9 place-items-center rounded-lg text-tinta-3 hover:bg-[#fbe5e5] hover:text-rojo" aria-label={`Borrar ${r.nombre}`}>
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>
      {editando && <EditorRubro key={clave} abierto inicial={editando} onCerrar={() => setEditando(null)} />}
    </>
  );
}
