import { obtenerIndice } from "@/lib/datos/catalogo";

/** Índice compacto del catálogo para la búsqueda instantánea (cacheado; se invalida con el tag "catalogo"). */
export async function GET() {
  const indice = await obtenerIndice();
  return Response.json(indice, {
    headers: { "Cache-Control": "public, max-age=60, s-maxage=600, stale-while-revalidate=86400" },
  });
}
