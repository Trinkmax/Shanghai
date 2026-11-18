import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FormProducto } from "@/components/panel/productos/FormProducto";
import { TituloPagina } from "@/components/panel/ui";
import { ImagenProducto } from "@/components/ui/ImagenProducto";
import { formatARS, formatNumero } from "@/lib/format";
import { puede } from "@/lib/panel/permisos";
import { requerirPerfil } from "@/lib/panel/sesion";
import { createClient } from "@/lib/supabase/server";

// Pantalla con sesión: puede bloquear en el servidor al navegar (Cache Components).
export const instant = false;

export const metadata: Metadata = { title: "Producto" };

export default async function EditarProducto({ params }: { params: Promise<{ id: string }> }) {
  const perfil = await requerirPerfil("ver_productos");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: p }, { data: rubros }] = await Promise.all([
    supabase.from("productos").select("*").eq("id", id).maybeSingle(),
    supabase.from("categorias").select("id, nombre").order("orden"),
  ]);
  if (!p) notFound();

  if (!puede(perfil.rol, "editar_catalogo")) {
    const rubro = rubros?.find((r) => r.id === p.categoria_id)?.nombre ?? "Sin rubro";
    return (
      <>
        <TituloPagina volver={{ href: "/panel/productos", texto: "Productos" }} titulo={p.nombre} descripcion={`Cód. ${p.codigo} · ${rubro}`} />
        <div className="grid gap-4 rounded-[var(--radius-pane)] border border-aluminio bg-white p-5 sm:grid-cols-[220px_1fr]">
          <ImagenProducto ruta={p.imagenes[0]} alt={p.nombre} tam="lg" className="aspect-square w-full rounded-xl border border-aluminio" />
          <dl className="grid content-start gap-3 text-[0.95rem]">
            <div>
              <dt className="text-tinta-3">Precio</dt>
              <dd className="tabular text-xl font-bold text-tinta">
                {formatARS(p.precio_oferta ?? p.precio)}
                {p.precio_oferta != null && <span className="ml-2 text-sm font-normal text-tinta-3 line-through">{formatARS(p.precio)}</span>}
              </dd>
            </div>
            <div>
              <dt className="text-tinta-3">Stock</dt>
              <dd className="text-tinta">{p.stock == null ? "No se controla" : `${formatNumero(p.stock)} unidades`}</dd>
            </div>
            <div>
              <dt className="text-tinta-3">Venta mínima</dt>
              <dd className="text-tinta">{p.cantidad_minima} u.</dd>
            </div>
            {p.descripcion && <p className="whitespace-pre-line text-tinta-2">{p.descripcion}</p>}
          </dl>
        </div>
      </>
    );
  }

  return (
    <>
      <TituloPagina volver={{ href: "/panel/productos", texto: "Productos" }} titulo={p.nombre} descripcion={`Cód. ${p.codigo} · ${formatNumero(p.vendidos)} unidades vendidas`} />
      <FormProducto
        rubros={rubros ?? []}
        inicial={{
          id: p.id,
          slug: p.slug,
          nombre: p.nombre,
          codigo: p.codigo,
          categoria_id: p.categoria_id,
          precio: Number(p.precio),
          precio_oferta: p.precio_oferta == null ? null : Number(p.precio_oferta),
          oferta_hasta: p.oferta_hasta,
          en_oferta: p.en_oferta,
          stock: p.stock,
          cantidad_minima: p.cantidad_minima,
          descripcion: p.descripcion,
          es_novedad: p.es_novedad,
          destacado: p.destacado,
          activo: p.activo,
          ranking_vendidos: p.ranking_vendidos,
          imagenes: p.imagenes,
        }}
      />
    </>
  );
}
