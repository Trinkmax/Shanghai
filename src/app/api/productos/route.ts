import type { NextRequest } from "next/server";
import { esOrden, listarProductos, type FiltroCatalogo } from "@/lib/datos/catalogo";

/** Páginas siguientes de un listado (el listado completo está cacheado; acá solo se corta). */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const orden = sp.get("orden");
  const filtro: FiltroCatalogo = {
    rubro: sp.get("rubro") ? Number(sp.get("rubro")) : null,
    ofertas: sp.get("ofertas") === "1",
    novedades: sp.get("novedades") === "1",
    vendidos: sp.get("vendidos") === "1",
    q: sp.get("q") ?? undefined,
    orden: esOrden(orden) ? orden : "relevancia",
  };
  const desde = Math.max(0, Number(sp.get("desde") ?? 0));
  const cantidad = Math.min(96, Math.max(1, Number(sp.get("cantidad") ?? 48)));
  const lista = await listarProductos(filtro);
  return Response.json(
    { total: lista.length, productos: lista.slice(desde, desde + cantidad) },
    { headers: { "Cache-Control": "public, max-age=30, s-maxage=300, stale-while-revalidate=3600" } },
  );
}
