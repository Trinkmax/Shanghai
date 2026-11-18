"use client";

import { CalendarClock, Tag, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Boton } from "@/components/ui/Boton";
import { ImagenProducto } from "@/components/ui/ImagenProducto";
import { ponerEnOferta, quitarOferta, quitarTodasLasOfertas } from "@/lib/actions/ofertas";
import type { ItemIndice } from "@/lib/datos/catalogo";
import { formatARS, formatFechaCorta } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useConfirmar } from "../Dialogo";
import { Campo } from "../formulario";
import { SelectorProductos } from "../SelectorProductos";
import { EstadoVacio, Tarjeta } from "../ui";

export type ProductoEnOferta = {
  id: string;
  nombre: string;
  codigo: string;
  precio: number;
  precio_oferta: number | null;
  oferta_hasta: string | null;
  en_oferta: boolean;
  imagenes: string[];
  vencida: boolean;
};

type Modo = "porcentaje" | "marca";

export function GestorOfertas({ ofertas }: { ofertas: ProductoEnOferta[] }) {
  const confirmar = useConfirmar();
  const [pendiente, empezar] = useTransition();
  const [elegidos, setElegidos] = useState<ItemIndice[]>([]);
  const [modo, setModo] = useState<Modo>("porcentaje");
  const [pct, setPct] = useState("15");
  const [hasta, setHasta] = useState("");
  const ids = useMemo(() => new Set([...ofertas.map((o) => o.id), ...elegidos.map((e) => e.i)]), [ofertas, elegidos]);

  function aplicar() {
    if (elegidos.length === 0) return;
    const valor = modo === "porcentaje" ? Number(pct.replace(",", ".")) : null;
    empezar(async () => {
      const r = await ponerEnOferta({ ids: elegidos.map((e) => e.i), modo, valor, hasta: hasta || null });
      if (!r.ok) return void toast.error(r.error);
      toast.success(`${r.data.cantidad} producto${r.data.cantidad === 1 ? "" : "s"} en oferta`, { description: "Ya aparecen en la sección Ofertas de la tienda." });
      setElegidos([]);
    });
  }

  function quitar(o: ProductoEnOferta) {
    empezar(async () => {
      const r = await quitarOferta([o.id]);
      if (r.ok) toast.success("Oferta quitada", { description: o.nombre });
      else toast.error(r.error);
    });
  }

  function quitarTodas() {
    empezar(async () => {
      const ok = await confirmar({
        titulo: "¿Quitar todas las ofertas?",
        descripcion: `Los ${ofertas.length} productos vuelven a su precio de lista y salen de la sección Ofertas.`,
        confirmar: "Quitar todas",
        peligro: true,
      });
      if (!ok) return;
      const r = await quitarTodasLasOfertas();
      if (r.ok) toast.success(`Se quitaron ${r.data.cantidad} ofertas`);
      else toast.error(r.error);
    });
  }

  const ejemplo = elegidos[0];
  const pctN = Number(pct.replace(",", "."));

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
      <Tarjeta
        titulo={`En oferta ahora · ${ofertas.length}`}
        accion={
          ofertas.length > 0 && (
            <button type="button" onClick={quitarTodas} disabled={pendiente} className="text-sm font-medium text-tinta-3 hover:text-rojo">
              Quitar todas
            </button>
          )
        }
        cuerpo={false}
      >
        {ofertas.length === 0 ? (
          <EstadoVacio icono={<Tag />} titulo="No hay ofertas activas" texto="Buscá productos a la derecha y ponelos en oferta con un porcentaje o solo con la marca de oferta." />
        ) : (
          <ul className="divide-y divide-aluminio">
            {ofertas.map((o) => {
              const pctO = o.precio_oferta ? Math.round((1 - o.precio_oferta / o.precio) * 100) : 0;
              return (
                <li key={o.id} className={cn("flex items-center gap-3 px-4 py-2.5 sm:px-5", o.vencida && "bg-vidrio/60")}>
                  <ImagenProducto ruta={o.imagenes[0]} alt="" className="size-12 shrink-0 rounded-lg border border-aluminio" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/panel/productos/${o.id}`} className="line-clamp-1 text-[0.92rem] font-medium text-tinta hover:underline">
                      {o.nombre}
                    </Link>
                    <p className="tabular mt-0.5 flex flex-wrap items-center gap-x-2 text-[0.76rem] text-tinta-3">
                      Cód. {o.codigo}
                      {o.oferta_hasta && (
                        <span className={cn("inline-flex items-center gap-1", o.vencida ? "font-semibold text-rojo" : "")}>
                          <CalendarClock className="size-3" />
                          {o.vencida ? "Venció" : "Hasta"} {formatFechaCorta(o.oferta_hasta)}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    {o.precio_oferta != null ? (
                      <>
                        <p className="tabular text-[0.95rem] font-bold text-tinta">{formatARS(o.precio_oferta)}</p>
                        <p className="tabular text-[0.75rem] text-tinta-3">
                          <span className="line-through">{formatARS(o.precio)}</span> · −{pctO}%
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="tabular text-[0.95rem] font-bold text-tinta">{formatARS(o.precio)}</p>
                        <span className="vinilo vinilo-ambar mt-0.5">Oferta</span>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => quitar(o)}
                    disabled={pendiente}
                    className="grid size-9 shrink-0 place-items-center rounded-lg text-tinta-3 hover:bg-[#fbe5e5] hover:text-rojo"
                    aria-label={`Quitar la oferta de ${o.nombre}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Tarjeta>

      <Tarjeta titulo="Poner productos en oferta" className="xl:sticky xl:top-6 xl:self-start">
        <SelectorProductos elegidos={ids} onElegir={(it) => setElegidos((l) => [...l, it])} accion="Elegir" />
        {elegidos.length > 0 && (
          <div className="mt-4 space-y-4">
            <ul className="flex flex-wrap gap-1.5">
              {elegidos.map((e) => (
                <li key={e.i} className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-marca-50 py-1 pl-2.5 pr-1 text-[0.82rem] text-marca-900">
                  <span className="truncate">{e.n}</span>
                  <button type="button" onClick={() => setElegidos((l) => l.filter((x) => x.i !== e.i))} className="grid size-5 place-items-center rounded text-marca-700 hover:bg-white" aria-label={`Sacar ${e.n}`}>
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de oferta">
              {(
                [
                  { id: "porcentaje", t: "Con descuento", d: "Precio tachado y %" },
                  { id: "marca", t: "Solo marcar", d: "El precio ya es el rebajado" },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={modo === m.id}
                  onClick={() => setModo(m.id)}
                  className="rounded-xl border border-aluminio-2 p-3 text-left aria-checked:border-marca-600 aria-checked:bg-marca-50 aria-checked:shadow-[0_0_0_1px_var(--color-marca-600)]"
                >
                  <span className="block text-[0.9rem] font-semibold text-tinta">{m.t}</span>
                  <span className="block text-[0.76rem] text-tinta-3">{m.d}</span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {modo === "porcentaje" && (
                <Campo
                  etiqueta="Descuento (%)"
                  value={pct}
                  onChange={(e) => setPct(e.target.value.replace(/[^\d,.]/g, ""))}
                  inputMode="decimal"
                  ayuda={ejemplo && pctN > 0 ? `${ejemplo.n.slice(0, 18)}…: ${formatARS(Math.round(((ejemplo.l ?? ejemplo.p) * (1 - pctN / 100)) / 10) * 10)}` : "Se redondea a $10."}
                />
              )}
              <Campo etiqueta="Termina (opcional)" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={modo === "marca" ? "col-span-2" : ""} />
            </div>
            <Boton tam="lg" className="w-full" cargando={pendiente} onClick={aplicar}>
              <Tag className="size-5" /> Poner {elegidos.length} en oferta
            </Boton>
          </div>
        )}
      </Tarjeta>
    </div>
  );
}
