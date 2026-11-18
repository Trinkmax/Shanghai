"use client";

import { ExternalLink, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Boton } from "@/components/ui/Boton";
import { ImagenProducto } from "@/components/ui/ImagenProducto";
import { Precio } from "@/components/ui/Precio";
import { eliminarProducto, guardarProducto, type DatosProducto } from "@/lib/actions/productos";
import { TZ_AR } from "@/lib/format";
import { esDeStorage, rutaMiniatura } from "@/lib/imagenes";
import { createClient } from "@/lib/supabase/client";
import { cn, slugify } from "@/lib/utils";
import { useConfirmar } from "../Dialogo";
import { AreaTexto, Campo, CampoMonto, Interruptor, Selector } from "../formulario";
import { Tarjeta } from "../ui";
import { Fotos } from "./Fotos";

export type ProductoEditable = {
  id?: string;
  nombre: string;
  codigo: string;
  slug?: string;
  categoria_id: number | null;
  precio: number | null;
  precio_oferta: number | null;
  oferta_hasta: string | null;
  en_oferta: boolean;
  stock: number | null;
  cantidad_minima: number;
  descripcion: string | null;
  es_novedad: boolean;
  destacado: boolean;
  activo: boolean;
  ranking_vendidos: number | null;
  imagenes: string[];
};

const aFecha = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("en-CA", { timeZone: TZ_AR, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso)) : "";

export function FormProducto({ inicial, rubros }: { inicial: ProductoEditable; rubros: { id: number; nombre: string }[] }) {
  const router = useRouter();
  const confirmar = useConfirmar();
  const [p, setP] = useState<ProductoEditable>(inicial);
  const [conOferta, setConOferta] = useState(inicial.precio_oferta != null);
  const [controlaStock, setControlaStock] = useState(inicial.stock != null);
  const [hasta, setHasta] = useState(aFecha(inicial.oferta_hasta));
  const [error, setError] = useState<string | null>(null);
  const [guardando, empezar] = useTransition();
  const [sucio, setSucio] = useState(false);

  const set = <K extends keyof ProductoEditable>(k: K, v: ProductoEditable[K]) => {
    setP((x) => ({ ...x, [k]: v }));
    setSucio(true);
  };

  useEffect(() => {
    if (!sucio) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [sucio]);

  const clave = slugify(p.codigo);
  const pct = conOferta && p.precio && p.precio_oferta ? Math.round((1 - p.precio_oferta / p.precio) * 100) : 0;
  const errOferta = conOferta && p.precio && p.precio_oferta && p.precio_oferta >= p.precio ? "Tiene que ser menor al precio de lista." : null;
  const vista = useMemo(() => {
    const final = conOferta && p.precio_oferta ? p.precio_oferta : p.precio ?? 0;
    return { final, lista: conOferta && p.precio_oferta ? p.precio : null };
  }, [conOferta, p.precio, p.precio_oferta]);

  function guardar(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    if (!p.precio) return setError("Ingresá el precio.");
    const datos: DatosProducto = {
      id: p.id,
      nombre: p.nombre,
      codigo: p.codigo,
      categoria_id: p.categoria_id,
      precio: p.precio,
      precio_oferta: conOferta ? p.precio_oferta : null,
      oferta_hasta: conOferta && hasta ? hasta : null,
      en_oferta: p.en_oferta,
      stock: controlaStock ? Math.max(0, Math.round(p.stock ?? 0)) : null,
      cantidad_minima: Math.max(1, Math.round(p.cantidad_minima || 1)),
      descripcion: p.descripcion,
      es_novedad: p.es_novedad,
      destacado: p.destacado,
      activo: p.activo,
      ranking_vendidos: p.ranking_vendidos,
      imagenes: p.imagenes,
    };
    empezar(async () => {
      const r = await guardarProducto(datos);
      if (!r.ok) {
        setError(r.error);
        toast.error(r.error);
        return;
      }
      // Fotos que se sacaron: se borran del bucket recién al guardar.
      const quitadas = inicial.imagenes.filter((x) => !p.imagenes.includes(x) && esDeStorage(x));
      if (quitadas.length) void createClient().storage.from("shangai").remove(quitadas.flatMap((x) => [x, rutaMiniatura(x)]));
      setSucio(false);
      toast.success(p.id ? "Cambios guardados" : "Producto creado", { description: "Ya se ve así en la tienda." });
      if (!p.id) router.replace(`/panel/productos/${r.data.id}`);
      else router.refresh();
    });
  }

  function borrar() {
    if (!p.id) return;
    empezar(async () => {
      const ok = await confirmar({
        titulo: "¿Eliminar este producto?",
        descripcion: "Se borra del catálogo y de la tienda, junto con sus fotos. Los pedidos anteriores conservan el nombre y el precio. Si solo querés que no se vea, ocultalo.",
        confirmar: "Eliminar",
        peligro: true,
      });
      if (!ok) return;
      const r = await eliminarProducto(p.id!);
      if (!r.ok) return void toast.error(r.error);
      setSucio(false);
      toast.success("Producto eliminado");
      router.replace("/panel/productos");
    });
  }

  return (
    <form onSubmit={guardar} className="grid gap-4 pb-24 lg:grid-cols-[minmax(0,1fr)_340px] lg:pb-0">
      <div className="min-w-0 space-y-4">
        <Tarjeta titulo="Fotos">
          <Fotos
            clave={clave}
            imagenes={p.imagenes}
            onCambiar={(l) => set("imagenes", l)}
            deshabilitado={clave ? null : "Primero escribí el código del producto: las fotos se guardan en su carpeta."}
          />
        </Tarjeta>

        <Tarjeta titulo="Datos">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_200px]">
            <Campo etiqueta="Nombre" value={p.nombre} onChange={(e) => set("nombre", e.target.value)} maxLength={160} required placeholder="Ej.: Parlante Bluetooth JBL M2T" />
            <Campo
              etiqueta="Código"
              value={p.codigo}
              onChange={(e) => set("codigo", e.target.value.trim())}
              maxLength={40}
              required
              ayuda={p.id ? "Si lo cambiás, cambia el enlace del producto." : "El mismo que usás en el local."}
            />
          </div>
          <Selector
            className="mt-4"
            etiqueta="Rubro"
            value={p.categoria_id ?? ""}
            onChange={(e) => set("categoria_id", e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Sin rubro</option>
            {rubros.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </Selector>
          <AreaTexto
            className="mt-4"
            etiqueta="Descripción (opcional)"
            value={p.descripcion ?? ""}
            onChange={(e) => set("descripcion", e.target.value)}
            rows={4}
            maxLength={4000}
            placeholder="Medidas, materiales, qué incluye la caja, colores disponibles…"
          />
        </Tarjeta>

        <Tarjeta titulo="Precio y oferta">
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoMonto etiqueta="Precio mayorista (por unidad)" valor={p.precio} onValor={(n) => set("precio", n)} placeholder="0" />
          </div>
          <div className="mt-5 space-y-4 rounded-2xl bg-vidrio p-4">
            <Interruptor
              etiqueta="Precio de oferta"
              descripcion="Muestra el precio tachado y el % de descuento."
              activo={conOferta}
              onCambiar={(v) => {
                setConOferta(v);
                setSucio(true);
                if (v) set("en_oferta", true);
              }}
            />
            {conOferta && (
              <div className="grid gap-4 sm:grid-cols-2">
                <CampoMonto
                  etiqueta="Precio de oferta"
                  valor={p.precio_oferta}
                  onValor={(n) => set("precio_oferta", n)}
                  error={errOferta}
                  ayuda={pct > 0 ? `${pct}% de descuento` : undefined}
                />
                <Campo
                  etiqueta="Termina (opcional)"
                  type="date"
                  value={hasta}
                  onChange={(e) => {
                    setHasta(e.target.value);
                    setSucio(true);
                  }}
                  ayuda="Sin fecha, dura hasta que la quites."
                />
              </div>
            )}
            <Interruptor
              etiqueta="Aparece en Ofertas"
              descripcion="Para precios que ya están rebajados aunque no muestren precio anterior."
              activo={p.en_oferta}
              onCambiar={(v) => set("en_oferta", v)}
            />
          </div>
        </Tarjeta>

        <Tarjeta titulo="Stock y venta">
          <Interruptor
            etiqueta="Controlar stock"
            descripcion="Cuando llega a 0 se muestra agotado y no se puede pedir. Cada venta lo descuenta y cada cancelación lo repone."
            activo={controlaStock}
            onCambiar={(v) => {
              setControlaStock(v);
              setSucio(true);
            }}
          />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {controlaStock && (
              <Campo
                etiqueta="Unidades en stock"
                type="number"
                min={0}
                inputMode="numeric"
                value={p.stock ?? ""}
                onChange={(e) => set("stock", e.target.value === "" ? null : Number(e.target.value))}
              />
            )}
            <Campo
              etiqueta="Venta mínima por producto"
              type="number"
              min={1}
              inputMode="numeric"
              value={p.cantidad_minima}
              onChange={(e) => set("cantidad_minima", Number(e.target.value) || 1)}
              ayuda="Ej.: 6 si se vende por media docena."
            />
          </div>
        </Tarjeta>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <Tarjeta titulo="Visibilidad">
          <div className="space-y-4">
            <Interruptor etiqueta="Visible en la tienda" activo={p.activo} onCambiar={(v) => set("activo", v)} />
            <Interruptor etiqueta="Nuevo" descripcion="Aparece en Recién llegados." activo={p.es_novedad} onCambiar={(v) => set("es_novedad", v)} />
            <Interruptor etiqueta="En la vidriera de la portada" activo={p.destacado} onCambiar={(v) => set("destacado", v)} />
            <Campo
              etiqueta="Puesto en Más vendidos (opcional)"
              type="number"
              min={1}
              max={999}
              inputMode="numeric"
              value={p.ranking_vendidos ?? ""}
              onChange={(e) => set("ranking_vendidos", e.target.value ? Number(e.target.value) : null)}
              ayuda="Vacío: lo ordenan las ventas reales."
            />
          </div>
        </Tarjeta>

        <Tarjeta titulo="Así se ve en la tienda">
          <div className="mx-auto max-w-[220px] overflow-hidden rounded-2xl border border-aluminio bg-white">
            <div className="relative p-3">
              <ImagenProducto ruta={p.imagenes[0]} alt="" className={cn("aspect-square w-full", !p.activo && "opacity-50 grayscale")} />
              <span className="absolute left-2.5 top-2.5 flex flex-col gap-1">
                {pct > 0 ? <span className="vinilo vinilo-ambar">−{pct}%</span> : p.en_oferta && <span className="vinilo vinilo-ambar">Oferta</span>}
                {p.es_novedad && <span className="vinilo vinilo-marca">Nuevo</span>}
              </span>
            </div>
            <div className="px-3 pb-3">
              <p className="line-clamp-2 min-h-[2.5em] text-[0.88rem] font-medium leading-tight text-tinta">{p.nombre || "Nombre del producto"}</p>
              <div className="mt-2">
                <Precio monto={vista.final} tachado={vista.lista} />
              </div>
              <p className="tabular mt-1 text-[0.72rem] text-tinta-3">Cód. {p.codigo || "—"}</p>
            </div>
          </div>
          {!p.activo && <p className="mt-3 text-center text-[0.82rem] font-medium text-tinta-3">Oculto: no se ve en la tienda.</p>}
        </Tarjeta>

        {error && (
          <p role="alert" className="rounded-xl bg-[#fbe5e5] px-3.5 py-2.5 text-[0.88rem] font-medium text-rojo">
            {error}
          </p>
        )}

        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 flex gap-2 border-t border-aluminio bg-white/95 p-3 backdrop-blur-md lg:static lg:flex-col lg:border-0 lg:bg-transparent lg:p-0">
          <Boton type="submit" tam="lg" cargando={guardando} className="flex-1 lg:w-full">
            <Save className="size-5" /> {p.id ? "Guardar cambios" : "Crear producto"}
          </Boton>
          {p.id && inicial.slug && (
            <Boton asChild variante="claro" tam="lg" className="lg:w-full">
              <Link href={`/producto/${inicial.slug}`} target="_blank">
                <ExternalLink className="size-5" /> <span className="hidden sm:inline">Ver en la tienda</span>
              </Link>
            </Boton>
          )}
        </div>
        {p.id && (
          <button
            type="button"
            onClick={borrar}
            className="hidden w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-tinta-3 hover:bg-[#fbe5e5] hover:text-rojo lg:flex"
          >
            <Trash2 className="size-4" /> Eliminar producto
          </button>
        )}
        {p.id && (
          <button type="button" onClick={borrar} className="w-full rounded-xl py-2.5 text-sm font-medium text-rojo lg:hidden">
            Eliminar producto
          </button>
        )}
        {sucio && <p className="text-center text-[0.8rem] text-tinta-3">Hay cambios sin guardar.</p>}
      </aside>
    </form>
  );
}
