import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { clientePublico } from "@/lib/supabase/publico";
import {
  COLUMNAS_PRODUCTO,
  vistaDe,
  type Categoria,
  type ConfigTienda,
  type ProductoTienda,
  type ProductoVista,
} from "@/lib/tienda";
import type { Tabla } from "@/lib/database.types";
import { normalizar } from "@/lib/utils";

/**
 * Lecturas públicas y cacheadas del catálogo. El panel invalida estos tags
 * (catalogo / configuracion / portada) con updateTag al guardar cambios.
 * Todo lo que depende de la hora (ofertas vigentes) se resuelve DENTRO de
 * funciones "use cache": los componentes reciben precios ya resueltos.
 */

export const TAGS = {
  catalogo: "catalogo",
  configuracion: "configuracion",
  portada: "portada",
} as const;

const PAGINA_PG = 1000; // max-rows de PostgREST

function normalizarConfig(c: Tabla<"configuracion">): ConfigTienda {
  return {
    ...c,
    compra_minima: Number(c.compra_minima),
    descuento_transferencia: Number(c.descuento_transferencia),
    horarios: (Array.isArray(c.horarios) ? c.horarios : []) as ConfigTienda["horarios"],
    envios: (Array.isArray(c.envios) ? c.envios : []) as ConfigTienda["envios"],
    transferencia_datos: {
      titular: "",
      banco: "",
      cbu: "",
      alias: "",
      cuit: "",
      ...((c.transferencia_datos ?? {}) as object),
    } as ConfigTienda["transferencia_datos"],
  };
}

export async function obtenerConfig(): Promise<ConfigTienda> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.configuracion);
  const { data, error } = await clientePublico().from("configuracion").select("*").eq("id", true).single();
  if (error) throw new Error(`No se pudo leer la configuración: ${error.message}`);
  return normalizarConfig(data);
}

export async function obtenerCategorias(): Promise<Categoria[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.catalogo);
  const { data, error } = await clientePublico()
    .from("categorias")
    .select("id, slug, nombre, icono, color, orden, productos(count)")
    .eq("activa", true)
    .order("orden");
  if (error) throw new Error(`No se pudieron leer los rubros: ${error.message}`);
  return (data ?? []).map(({ productos, ...c }) => ({
    ...c,
    cantidad: (productos as unknown as { count: number }[])?.[0]?.count ?? 0,
  }));
}

function aTienda(p: Record<string, unknown>): ProductoTienda {
  return {
    ...(p as unknown as ProductoTienda),
    precio: Number(p.precio),
    precio_oferta: p.precio_oferta == null ? null : Number(p.precio_oferta),
  };
}

/** Todo el catálogo activo, ya resuelto (precio final, oferta, agotado). */
export async function obtenerTodos(): Promise<ProductoVista[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.catalogo);
  const sb = clientePublico();
  const ahora = Date.now();
  const todos: ProductoVista[] = [];
  for (let desde = 0; ; desde += PAGINA_PG) {
    const { data, error } = await sb
      .from("productos")
      .select(`${COLUMNAS_PRODUCTO}, creado_en`)
      .eq("activo", true)
      .order("orden")
      .range(desde, desde + PAGINA_PG - 1);
    if (error) throw new Error(`No se pudo leer el catálogo: ${error.message}`);
    todos.push(...(data ?? []).map((p) => vistaDe(aTienda(p), ahora)));
    if (!data || data.length < PAGINA_PG) break;
  }
  return todos;
}

export type OrdenCatalogo = "relevancia" | "nuevos" | "precio-asc" | "precio-desc" | "nombre" | "vendidos";

export const ORDENES: { id: OrdenCatalogo; texto: string }[] = [
  { id: "relevancia", texto: "Destacados" },
  { id: "nuevos", texto: "Más nuevos" },
  { id: "vendidos", texto: "Más vendidos" },
  { id: "precio-asc", texto: "Menor precio" },
  { id: "precio-desc", texto: "Mayor precio" },
  { id: "nombre", texto: "A–Z" },
];

export const esOrden = (v: unknown): v is OrdenCatalogo => ORDENES.some((o) => o.id === v);

function puntajeVendidos(p: ProductoVista) {
  // Posición fijada por el dueño primero; después, unidades vendidas reales.
  return p.ranking_vendidos != null ? 1_000_000 - p.ranking_vendidos : p.vendidos;
}

function ordenar(lista: ProductoVista[], orden: OrdenCatalogo): ProductoVista[] {
  const l = [...lista];
  switch (orden) {
    case "nuevos":
      return l.sort((a, b) => b.creado_en.localeCompare(a.creado_en));
    case "precio-asc":
      return l.sort((a, b) => a.precio_final - b.precio_final);
    case "precio-desc":
      return l.sort((a, b) => b.precio_final - a.precio_final);
    case "nombre":
      return l.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    case "vendidos":
      return l.sort((a, b) => puntajeVendidos(b) - puntajeVendidos(a));
    default: {
      // Con foto primero: un paño sin foto no vende. Después ofertas, más vendidos y novedades.
      const peso = (p: ProductoVista) =>
        (p.imagenes.length ? 8 : 0) +
        (p.oferta ? 4 : 0) +
        (p.ranking_vendidos != null || p.vendidos > 0 ? 3 : 0) +
        (p.es_novedad ? 2 : 0) -
        (p.agotado ? 10 : 0);
      return l.sort((a, b) => peso(b) - peso(a) || b.creado_en.localeCompare(a.creado_en));
    }
  }
}

export type FiltroCatalogo = {
  rubro?: number | null;
  ofertas?: boolean;
  novedades?: boolean;
  vendidos?: boolean;
  q?: string;
  orden?: OrdenCatalogo;
  min?: number | null;
  max?: number | null;
};

/** Listado filtrado y ordenado (cacheado por combinación de filtros). */
export async function listarProductos(f: FiltroCatalogo): Promise<ProductoVista[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.catalogo);
  let l = await obtenerTodos();
  if (f.rubro) l = l.filter((p) => p.categoria_id === f.rubro);
  if (f.ofertas) l = l.filter((p) => p.oferta);
  if (f.novedades) l = l.filter((p) => p.es_novedad);
  if (f.vendidos) l = l.filter((p) => p.ranking_vendidos != null || p.vendidos > 0);
  if (f.min != null) l = l.filter((p) => p.precio_final >= f.min!);
  if (f.max != null) l = l.filter((p) => p.precio_final <= f.max!);
  if (f.q && f.q.trim()) {
    const terminos = normalizar(f.q).split(/\s+/).filter(Boolean);
    l = l
      .map((p) => {
        const texto = normalizar(`${p.nombre} ${p.codigo}`);
        const codigo = normalizar(p.codigo);
        let puntos = 0;
        for (const t of terminos) {
          if (codigo === t) puntos += 50;
          else if (codigo.startsWith(t)) puntos += 20;
          if (texto.includes(t)) puntos += 10;
          else return null;
        }
        if (normalizar(p.nombre).startsWith(terminos[0])) puntos += 5;
        return { p, puntos };
      })
      .filter((x): x is { p: ProductoVista; puntos: number } => x !== null)
      .sort((a, b) => b.puntos - a.puntos)
      .map((x) => x.p);
    if (!f.orden || f.orden === "relevancia") return l;
  }
  return ordenar(l, f.orden ?? "relevancia");
}

export async function obtenerOfertas(): Promise<ProductoVista[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.catalogo);
  const todos = await obtenerTodos();
  return ordenar(
    todos.filter((p) => p.oferta),
    "relevancia",
  );
}

export async function obtenerMasVendidos(limite = 24): Promise<ProductoVista[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.catalogo);
  const todos = await obtenerTodos();
  return ordenar(
    todos.filter((p) => (p.ranking_vendidos != null || p.vendidos > 0) && !p.agotado),
    "vendidos",
  ).slice(0, limite);
}

export async function obtenerNovedades(limite = 0): Promise<ProductoVista[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.catalogo);
  const todos = await obtenerTodos();
  const l = ordenar(
    todos.filter((p) => p.es_novedad),
    "nuevos",
  );
  if (!limite) return l;
  // Para vitrinas cortas (portada), solo las que tienen foto.
  const conFoto = l.filter((p) => p.imagenes.length);
  return (conFoto.length >= limite ? conFoto : l).slice(0, limite);
}

export async function obtenerDestacados(): Promise<ProductoVista[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.catalogo);
  const { data, error } = await clientePublico()
    .from("productos")
    .select(`${COLUMNAS_PRODUCTO}, creado_en`)
    .eq("activo", true)
    .eq("destacado", true)
    .order("orden")
    .limit(24);
  if (error) throw new Error(error.message);
  const ahora = Date.now();
  return (data ?? []).map((p) => vistaDe(aTienda(p), ahora));
}

export type ProductoDetalle = ProductoVista & {
  descripcion: string | null;
  categoria: Pick<Categoria, "id" | "slug" | "nombre" | "icono" | "color"> | null;
};

export async function obtenerProducto(slug: string): Promise<ProductoDetalle | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.catalogo);
  const { data, error } = await clientePublico()
    .from("productos")
    .select(`${COLUMNAS_PRODUCTO}, creado_en, descripcion, categoria:categorias(id, slug, nombre, icono, color)`)
    .eq("slug", slug)
    .eq("activo", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const { categoria, descripcion, ...resto } = data as unknown as Record<string, unknown> & {
    categoria: ProductoDetalle["categoria"];
    descripcion: string | null;
  };
  return { ...vistaDe(aTienda(resto), Date.now()), descripcion: descripcion ?? null, categoria };
}

export async function obtenerRelacionados(producto: { id: string; categoria_id: number | null }, limite = 12) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.catalogo);
  const todos = await obtenerTodos();
  return ordenar(
    todos.filter((p) => p.categoria_id === producto.categoria_id && p.id !== producto.id && !p.agotado),
    "relevancia",
  ).slice(0, limite);
}

/** Slugs que se prerenderizan en el build (el resto se genera en la primera visita). */
export async function obtenerSlugsPopulares(): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.catalogo);
  const todos = await obtenerTodos();
  return todos
    .filter((p) => p.oferta || p.ranking_vendidos != null || p.destacado)
    .slice(0, 80)
    .map((p) => p.slug);
}

export async function obtenerBanners(): Promise<Tabla<"banners">[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.portada);
  const { data, error } = await clientePublico().from("banners").select("*").order("orden");
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Índice compacto para la búsqueda instantánea del navegador. */
export type ItemIndice = {
  i: string; // id
  c: string; // código
  s: string; // slug
  n: string; // nombre
  p: number; // precio final
  l: number | null; // precio de lista (si hay oferta con precio)
  o: 0 | 1; // es oferta
  m: string | null; // imagen (ruta)
  k: number | null; // categoría
  q: number; // cantidad mínima
  x: number | null; // stock
  v: 0 | 1; // novedad
};

export async function obtenerIndice(): Promise<ItemIndice[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.catalogo);
  const todos = await obtenerTodos();
  return todos.map((p) => ({
    i: p.id,
    c: p.codigo,
    s: p.slug,
    n: p.nombre,
    p: p.precio_final,
    l: p.precio_lista,
    o: p.oferta ? 1 : 0,
    m: p.imagenes[0] ?? null,
    k: p.categoria_id,
    q: p.cantidad_minima,
    x: p.stock,
    v: p.es_novedad ? 1 : 0,
  }));
}

/** Sugerencias para completar el mínimo: más vendidos y ofertas, sin repetidos. */
export async function obtenerSugeridos(): Promise<ProductoVista[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.catalogo);
  const [vendidos, ofertas] = await Promise.all([obtenerMasVendidos(10), obtenerOfertas()]);
  const vistos = new Set<string>();
  const out: ProductoVista[] = [];
  for (const p of [...vendidos, ...ofertas.filter((o) => !o.agotado && o.precio_final < 60000)]) {
    if (vistos.has(p.id) || !p.imagenes.length) continue;
    vistos.add(p.id);
    out.push(p);
  }
  return out.slice(0, 14);
}
