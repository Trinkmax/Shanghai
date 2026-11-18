import { PackageSearch, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BuscadorURL } from "@/components/panel/BuscadorURL";
import { FiltrosProductos } from "@/components/panel/productos/FiltrosProductos";
import { TablaProductos, type FilaProducto } from "@/components/panel/productos/TablaProductos";
import { EstadoVacio, Paginador, TituloPagina } from "@/components/panel/ui";
import { Boton } from "@/components/ui/Boton";
import { formatNumero } from "@/lib/format";
import { puede } from "@/lib/panel/permisos";
import { requerirPerfil } from "@/lib/panel/sesion";
import { createClient } from "@/lib/supabase/server";
import { normalizar } from "@/lib/utils";

// Pantalla con sesión: puede bloquear en el servidor al navegar (Cache Components).
export const instant = false;

export const metadata: Metadata = { title: "Productos" };

const POR_PAGINA = 50;
type Params = { q?: string; rubro?: string; estado?: string; filtro?: string; orden?: string; pagina?: string };

export default async function Productos({ searchParams }: { searchParams: Promise<Params> }) {
  const perfil = await requerirPerfil("ver_productos");
  const editable = puede(perfil.rol, "editar_catalogo");
  const sp = await searchParams;
  const pagina = Math.max(1, Number(sp.pagina) || 1);
  const supabase = await createClient();

  let c = supabase
    .from("productos")
    .select(
      "id, codigo, slug, nombre, precio, precio_oferta, en_oferta, stock, activo, es_novedad, destacado, imagenes, categoria_id, ranking_vendidos",
      { count: "exact" },
    );

  const palabras = normalizar(sp.q ?? "")
    .replace(/[%_*,()]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6);
  for (const w of palabras) c = c.ilike("busqueda", `%${w}%`);

  if (sp.rubro === "sin") c = c.is("categoria_id", null);
  else if (sp.rubro && /^\d+$/.test(sp.rubro)) c = c.eq("categoria_id", Number(sp.rubro));

  if (sp.estado === "activos") c = c.eq("activo", true);
  else if (sp.estado === "ocultos") c = c.eq("activo", false);

  switch (sp.filtro) {
    case "oferta":
      c = c.or("en_oferta.eq.true,precio_oferta.not.is.null");
      break;
    case "novedad":
      c = c.eq("es_novedad", true);
      break;
    case "destacado":
      c = c.eq("destacado", true);
      break;
    case "sin_foto":
      c = c.filter("imagenes", "eq", "{}");
      break;
    case "stock_bajo":
      c = c.not("stock", "is", null).lte("stock", 5);
      break;
    case "ranking":
      c = c.not("ranking_vendidos", "is", null);
      break;
  }

  switch (sp.orden) {
    case "precio-asc":
      c = c.order("precio", { ascending: true });
      break;
    case "precio-desc":
      c = c.order("precio", { ascending: false });
      break;
    case "recientes":
      c = c.order("actualizado_en", { ascending: false });
      break;
    case "vendidos":
      c = c.order("vendidos", { ascending: false });
      break;
    default:
      c = c.order("nombre", { ascending: true });
  }

  const [{ data, count, error }, { data: rubros }] = await Promise.all([
    c.range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1),
    supabase.from("categorias").select("id, nombre").order("orden"),
  ]);
  if (error) throw new Error(error.message);
  const filas: FilaProducto[] = (data ?? []).map((f) => ({ ...f, precio: Number(f.precio), precio_oferta: f.precio_oferta == null ? null : Number(f.precio_oferta) }));
  const hayFiltros = Boolean(sp.q || sp.rubro || sp.estado || sp.filtro);

  return (
    <>
      <TituloPagina
        titulo="Productos"
        descripcion={
          editable
            ? `${formatNumero(count ?? 0)} productos${hayFiltros ? " con estos filtros" : ""}. Tocá un precio o un stock para cambiarlo ahí mismo.`
            : `${formatNumero(count ?? 0)} productos. Consultá precios, stock y códigos.`
        }
        acciones={
          editable && (
            <Boton asChild>
              <Link href="/panel/productos/nuevo">
                <Plus className="size-4" /> Nuevo producto
              </Link>
            </Boton>
          )
        }
      />

      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center">
        <Suspense fallback={<div className="esqueleto h-11 w-full xl:w-96" />}>
          <BuscadorURL placeholder="Buscar por nombre o código" className="w-full xl:w-96" />
        </Suspense>
        <Suspense fallback={<div className="esqueleto h-11 flex-1" />}>
          <FiltrosProductos rubros={rubros ?? []} />
        </Suspense>
      </div>

      {filas.length === 0 ? (
        <div className="rounded-[var(--radius-pane)] border border-aluminio bg-white">
          <EstadoVacio
            icono={<PackageSearch />}
            titulo={hayFiltros ? "No hay productos con estos filtros" : "Todavía no hay productos"}
            texto={hayFiltros ? "Probá sacando algún filtro o buscando por código." : "Cargá el primero y aparece en la tienda al instante."}
            accion={
              hayFiltros ? (
                <Boton asChild variante="claro">
                  <Link href="/panel/productos">Ver todos</Link>
                </Boton>
              ) : (
                editable && (
                  <Boton asChild>
                    <Link href="/panel/productos/nuevo">Nuevo producto</Link>
                  </Boton>
                )
              )
            }
          />
        </div>
      ) : (
        <TablaProductos filas={filas} rubros={rubros ?? []} editable={editable} />
      )}
      <Paginador
        pagina={pagina}
        total={count ?? 0}
        porPagina={POR_PAGINA}
        base="/panel/productos"
        params={{ q: sp.q, rubro: sp.rubro, estado: sp.estado, filtro: sp.filtro, orden: sp.orden }}
      />
    </>
  );
}
