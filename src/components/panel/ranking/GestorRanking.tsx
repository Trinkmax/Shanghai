"use client";

import { ArrowDown, ArrowUp, Plus, Save, Trophy, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Boton } from "@/components/ui/Boton";
import { ImagenProducto } from "@/components/ui/ImagenProducto";
import { guardarRanking } from "@/lib/actions/ranking";
import { formatARS, formatNumero } from "@/lib/format";
import { SelectorProductos } from "../SelectorProductos";
import { EstadoVacio, Tarjeta } from "../ui";

export type ItemRanking = { id: string; nombre: string; codigo: string; precio: number; imagen: string | null; vendidos: number };

export function GestorRanking({ fijados, porVentas }: { fijados: ItemRanking[]; porVentas: ItemRanking[] }) {
  const [lista, setLista] = useState(fijados);
  const [pendiente, empezar] = useTransition();
  const sucio = lista.map((x) => x.id).join() !== fijados.map((x) => x.id).join();
  const ids = useMemo(() => new Set(lista.map((x) => x.id)), [lista]);

  const mover = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= lista.length) return;
    const l = [...lista];
    [l[i], l[j]] = [l[j], l[i]];
    setLista(l);
  };

  function guardar() {
    empezar(async () => {
      const r = await guardarRanking(lista.map((x) => x.id));
      if (r.ok) toast.success("Ranking guardado", { description: "La sección Más vendidos ya muestra este orden." });
      else toast.error(r.error);
    });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
      <Tarjeta
        titulo="Puestos fijados"
        descripcion="Estos van primero, en este orden. Después siguen solos los que más se venden."
        accion={
          <Boton tam="sm" disabled={!sucio} cargando={pendiente} onClick={guardar}>
            <Save className="size-4" /> Guardar
          </Boton>
        }
        cuerpo={false}
      >
        {lista.length === 0 ? (
          <EstadoVacio icono={<Trophy />} titulo="Sin puestos fijados" texto="El ranking se arma solo con las ventas reales. Si querés empujar algún producto, sumalo desde la derecha." />
        ) : (
          <ol className="divide-y divide-aluminio">
            {lista.map((x, i) => (
              <li key={x.id} className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
                <span className="rotulo tabular w-8 text-center text-lg text-marca-400">{i + 1}</span>
                <ImagenProducto ruta={x.imagen} alt="" className="size-11 shrink-0 rounded-lg border border-aluminio" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.92rem] font-medium text-tinta">{x.nombre}</p>
                  <p className="tabular text-[0.76rem] text-tinta-3">
                    Cód. {x.codigo} · {formatARS(x.precio)} · {formatNumero(x.vendidos)} vendidos
                  </p>
                </div>
                <div className="flex items-center">
                  <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} className="grid size-8 place-items-center rounded-lg text-tinta-3 hover:bg-vidrio hover:text-tinta disabled:opacity-30" aria-label={`Subir ${x.nombre}`}>
                    <ArrowUp className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => mover(i, 1)}
                    disabled={i === lista.length - 1}
                    className="grid size-8 place-items-center rounded-lg text-tinta-3 hover:bg-vidrio hover:text-tinta disabled:opacity-30"
                    aria-label={`Bajar ${x.nombre}`}
                  >
                    <ArrowDown className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setLista((l) => l.filter((y) => y.id !== x.id))}
                    className="grid size-8 place-items-center rounded-lg text-tinta-3 hover:bg-[#fbe5e5] hover:text-rojo"
                    aria-label={`Sacar ${x.nombre} del ranking`}
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
        {sucio && (
          <p className="border-t border-aluminio bg-[#fff7dc] px-4 py-2.5 text-[0.85rem] text-ambar-tinta">Tenés cambios sin guardar.</p>
        )}
      </Tarjeta>

      <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
        <Tarjeta titulo="Sumar un producto">
          <SelectorProductos
            elegidos={ids}
            onElegir={(it) =>
              setLista((l) => [...l, { id: it.i, nombre: it.n, codigo: it.c, precio: it.p, imagen: it.m, vendidos: 0 }])
            }
          />
        </Tarjeta>
        {porVentas.filter((p) => !ids.has(p.id)).length > 0 && (
          <Tarjeta titulo="Los que más se venden" descripcion="Según pedidos confirmados y ventas de mostrador." cuerpo={false}>
            <ul className="divide-y divide-aluminio">
              {porVentas
                .filter((p) => !ids.has(p.id))
                .map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                    <ImagenProducto ruta={p.imagen} alt="" className="size-10 shrink-0 rounded-lg border border-aluminio" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.88rem] text-tinta">{p.nombre}</span>
                      <span className="tabular text-[0.75rem] text-tinta-3">{formatNumero(p.vendidos)} vendidos</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setLista((l) => [...l, p])}
                      className="presionable inline-flex h-8 items-center gap-1 rounded-lg bg-marca-700 px-2.5 text-[0.8rem] font-semibold text-white"
                    >
                      <Plus className="size-3.5" /> Fijar
                    </button>
                  </li>
                ))}
            </ul>
          </Tarjeta>
        )}
      </div>
    </div>
  );
}
