"use client";

import { ArrowDown, ArrowRight, ArrowUp, EyeOff, Pencil, Plus, Star, Trash2, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Boton } from "@/components/ui/Boton";
import { ImagenProducto } from "@/components/ui/ImagenProducto";
import { alternarDestacado, eliminarBanner, guardarBanner, reordenarBanners } from "@/lib/actions/portada";
import type { TonoBanner } from "@/lib/database.types";
import { formatFechaCorta } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Dialogo, useConfirmar } from "../Dialogo";
import { Campo, Interruptor } from "../formulario";
import { SelectorProductos } from "../SelectorProductos";
import { EstadoVacio, Tarjeta } from "../ui";

export type Banner = {
  id: number;
  titulo: string;
  bajada: string | null;
  cta_texto: string | null;
  cta_href: string | null;
  tono: TonoBanner;
  activo: boolean;
  desde: string | null;
  hasta: string | null;
};

export type Destacado = { id: string; nombre: string; codigo: string; imagen: string | null };

const TONOS: { id: TonoBanner; texto: string; clase: string; titulo: string; bajada: string; boton: string }[] = [
  { id: "indigo", texto: "Índigo", clase: "cartel", titulo: "text-white", bajada: "text-marca-100", boton: "bg-white text-marca-800" },
  {
    id: "noche",
    texto: "Noche",
    clase: "bg-[radial-gradient(120%_90%_at_20%_0%,#2c2470_0%,#16113d_55%,#0d0a26_100%)] text-white",
    titulo: "text-white",
    bajada: "text-marca-200",
    boton: "bg-ambar text-ambar-tinta",
  },
  {
    id: "ambar",
    texto: "Ámbar",
    clase: "bg-[linear-gradient(160deg,#ffd75a_0%,#ffc21a_45%,#f5ad00_100%)]",
    titulo: "text-ambar-tinta",
    bajada: "text-ambar-tinta/80",
    boton: "bg-ambar-tinta text-ambar",
  },
  { id: "claro", texto: "Claro", clase: "border border-aluminio bg-white", titulo: "text-marca-700", bajada: "text-tinta-2", boton: "cartel" },
];

const tono = (t: TonoBanner) => TONOS.find((x) => x.id === t) ?? TONOS[0];

function VistaCartel({ b, className }: { b: Pick<Banner, "titulo" | "bajada" | "cta_texto" | "tono">; className?: string }) {
  const t = tono(b.tono);
  return (
    <div className={cn("relative flex min-h-[11rem] flex-col overflow-hidden rounded-[1.25rem] p-5", t.clase, className)}>
      {b.tono === "indigo" && <span className="cartel-luz" />}
      <p className={cn("rotulo max-w-[18ch] text-[1.35rem]", t.titulo)}>{b.titulo || "Título del cartel"}</p>
      {b.bajada && <p className={cn("mt-2 max-w-[34ch] text-[0.85rem] leading-relaxed", t.bajada)}>{b.bajada}</p>}
      {b.cta_texto && (
        <span className={cn("mt-4 inline-flex h-9 w-fit items-center gap-1.5 rounded-lg px-3 text-[0.82rem] font-semibold", t.boton)}>
          {b.cta_texto} <ArrowRight className="size-3.5" />
        </span>
      )}
    </div>
  );
}

const aFecha = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Argentina/Cordoba" }) : "");

function EditorCartel({ inicial, onCerrar }: { inicial: Partial<Banner>; onCerrar: () => void }) {
  const [b, setB] = useState({
    id: inicial.id,
    titulo: inicial.titulo ?? "",
    bajada: inicial.bajada ?? "",
    cta_texto: inicial.cta_texto ?? "",
    cta_href: inicial.cta_href ?? "",
    tono: (inicial.tono ?? "indigo") as TonoBanner,
    activo: inicial.activo ?? true,
    desde: aFecha(inicial.desde ?? null),
    hasta: aFecha(inicial.hasta ?? null),
  });
  const [error, setError] = useState<string | null>(null);
  const [pendiente, empezar] = useTransition();

  return (
    <Dialogo
      abierto
      onCambiar={(v) => !v && onCerrar()}
      titulo={b.id ? "Editar cartel" : "Nuevo cartel"}
      ancho="max-w-2xl"
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
                const r = await guardarBanner({
                  ...b,
                  bajada: b.bajada || null,
                  cta_texto: b.cta_texto || null,
                  cta_href: b.cta_href || null,
                  desde: b.desde || null,
                  hasta: b.hasta || null,
                });
                if (!r.ok) return setError(r.error);
                toast.success("Cartel guardado", { description: "La portada ya lo muestra." });
                onCerrar();
              })
            }
          >
            Guardar
          </Boton>
        </>
      }
    >
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-4">
          <Campo etiqueta="Título" value={b.titulo} onChange={(e) => setB({ ...b, titulo: e.target.value })} maxLength={90} autoFocus error={error} />
          <Campo etiqueta="Texto (opcional)" value={b.bajada} onChange={(e) => setB({ ...b, bajada: e.target.value })} maxLength={220} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Texto del botón" value={b.cta_texto} onChange={(e) => setB({ ...b, cta_texto: e.target.value })} maxLength={40} placeholder="Ver Navidad" />
            <Campo
              etiqueta="Lleva a"
              value={b.cta_href}
              onChange={(e) => setB({ ...b, cta_href: e.target.value })}
              placeholder="/rubro/navidad"
              ayuda="/ofertas, /novedades, /rubro/…"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Desde (opcional)" type="date" value={b.desde} onChange={(e) => setB({ ...b, desde: e.target.value })} />
            <Campo etiqueta="Hasta (opcional)" type="date" value={b.hasta} onChange={(e) => setB({ ...b, hasta: e.target.value })} />
          </div>
          <Interruptor etiqueta="Visible en la portada" activo={b.activo} onCambiar={(v) => setB({ ...b, activo: v })} />
        </div>
        <div>
          <p className="mb-2 text-[0.88rem] font-medium text-tinta">Color</p>
          <div className="mb-4 grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Color del cartel">
            {TONOS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={b.tono === t.id}
                onClick={() => setB({ ...b, tono: t.id })}
                className={cn("h-10 rounded-lg ring-offset-2 aria-checked:ring-2 aria-checked:ring-tinta", t.clase)}
                aria-label={t.texto}
                title={t.texto}
              />
            ))}
          </div>
          <VistaCartel b={b} />
        </div>
      </div>
    </Dialogo>
  );
}

export function GestorPortada({ banners, destacados }: { banners: Banner[]; destacados: Destacado[] }) {
  const confirmar = useConfirmar();
  const [editando, setEditando] = useState<Partial<Banner> | null>(null);
  const [pendiente, empezar] = useTransition();
  const ids = useMemo(() => new Set(destacados.map((d) => d.id)), [destacados]);

  function mover(i: number, d: -1 | 1) {
    const j = i + d;
    if (j < 0 || j >= banners.length) return;
    const l = banners.map((b) => b.id);
    [l[i], l[j]] = [l[j], l[i]];
    empezar(async () => {
      const r = await reordenarBanners(l);
      if (!r.ok) toast.error(r.error);
    });
  }

  function destacar(id: string, v: boolean) {
    empezar(async () => {
      const r = await alternarDestacado(id, v);
      if (!r.ok) toast.error(r.error);
    });
  }

  return (
    <div className="space-y-6">
      <Tarjeta
        titulo="Carteles de temporada"
        descripcion="Aparecen en la portada, en este orden. Los que tienen fechas se prenden y apagan solos."
        accion={
          <Boton tam="sm" onClick={() => setEditando({})}>
            <Plus className="size-4" /> Nuevo cartel
          </Boton>
        }
      >
        {banners.length === 0 ? (
          <EstadoVacio titulo="Todavía no hay carteles" texto="Armá uno para la temporada (Navidad, vuelta a clases, verano) y llevalo a un rubro." />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {banners.map((b, i) => (
              <li key={b.id} className={cn("rounded-[1.4rem] border border-aluminio bg-vidrio/50 p-2", !b.activo && "opacity-60")}>
                <VistaCartel b={b} />
                <div className="flex items-center gap-1 px-1 pt-2">
                  <p className="min-w-0 flex-1 truncate text-[0.8rem] text-tinta-3">
                    {!b.activo && (
                      <span className="mr-1.5 inline-flex items-center gap-1 font-semibold text-tinta-2">
                        <EyeOff className="size-3" /> Oculto ·
                      </span>
                    )}
                    {b.cta_href ?? "Sin enlace"}
                    {(b.desde || b.hasta) && ` · ${b.desde ? formatFechaCorta(b.desde) : "…"}–${b.hasta ? formatFechaCorta(b.hasta) : "…"}`}
                  </p>
                  <button type="button" onClick={() => mover(i, -1)} disabled={i === 0 || pendiente} className="grid size-8 place-items-center rounded-lg text-tinta-3 hover:bg-white disabled:opacity-30" aria-label="Mover antes">
                    <ArrowUp className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => mover(i, 1)}
                    disabled={i === banners.length - 1 || pendiente}
                    className="grid size-8 place-items-center rounded-lg text-tinta-3 hover:bg-white disabled:opacity-30"
                    aria-label="Mover después"
                  >
                    <ArrowDown className="size-4" />
                  </button>
                  <button type="button" onClick={() => setEditando(b)} className="grid size-8 place-items-center rounded-lg text-tinta-3 hover:bg-white hover:text-tinta" aria-label={`Editar ${b.titulo}`}>
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!(await confirmar({ titulo: `¿Borrar “${b.titulo}”?`, confirmar: "Borrar", peligro: true }))) return;
                      const r = await eliminarBanner(b.id);
                      if (r.ok) toast.success("Cartel borrado");
                      else toast.error(r.error);
                    }}
                    className="grid size-8 place-items-center rounded-lg text-tinta-3 hover:bg-[#fbe5e5] hover:text-rojo"
                    aria-label={`Borrar ${b.titulo}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Tarjeta
          titulo={`Productos en la vidriera · ${destacados.length}`}
          descripcion="Son los que aparecen detrás del vidrio en la portada (los primeros 6 se ven siempre)."
          cuerpo={false}
        >
          {destacados.length === 0 ? (
            <EstadoVacio icono={<Star />} titulo="La vidriera está vacía" texto="Elegí productos lindos y con buena foto: es lo primero que ve el cliente." />
          ) : (
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {destacados.map((d, i) => (
                <li key={d.id} className="relative border-b border-r border-aluminio p-3">
                  {i < 6 && <span className="vinilo vinilo-marca absolute left-2 top-2 z-[1]">{i + 1}</span>}
                  <ImagenProducto ruta={d.imagen} alt="" className="aspect-square w-full rounded-lg" />
                  <p className="mt-2 line-clamp-2 min-h-[2.4em] text-[0.8rem] leading-tight text-tinta">{d.nombre}</p>
                  <button
                    type="button"
                    onClick={() => destacar(d.id, false)}
                    disabled={pendiente}
                    className="absolute right-2 top-2 grid size-7 place-items-center rounded-lg bg-white/95 text-tinta-3 shadow hover:text-rojo"
                    aria-label={`Sacar ${d.nombre} de la vidriera`}
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
        <Tarjeta titulo="Sumar a la vidriera" className="xl:sticky xl:top-6 xl:self-start">
          <SelectorProductos elegidos={ids} onElegir={(it) => destacar(it.i, true)} accion="Sumar" />
        </Tarjeta>
      </div>

      {editando && <EditorCartel inicial={editando} onCerrar={() => setEditando(null)} />}
    </div>
  );
}
