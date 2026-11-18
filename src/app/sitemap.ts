import type { MetadataRoute } from "next";
import { obtenerCategorias, obtenerTodos } from "@/lib/datos/catalogo";

const SITIO = process.env.NEXT_PUBLIC_SITIO_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categorias, productos] = await Promise.all([obtenerCategorias(), obtenerTodos()]);
  const fijas = ["", "/catalogo", "/ofertas", "/mas-vendidos", "/novedades"].map((r) => ({
    url: `${SITIO}${r}`,
    changeFrequency: "daily" as const,
    priority: r === "" ? 1 : 0.8,
  }));
  return [
    ...fijas,
    ...categorias.map((c) => ({ url: `${SITIO}/rubro/${c.slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...productos.map((p) => ({ url: `${SITIO}/producto/${p.slug}`, changeFrequency: "weekly" as const, priority: 0.5 })),
  ];
}
