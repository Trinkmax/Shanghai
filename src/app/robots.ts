import type { MetadataRoute } from "next";

const SITIO = process.env.NEXT_PUBLIC_SITIO_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/panel", "/checkout", "/pedido/", "/api/"] }],
    sitemap: `${SITIO}/sitemap.xml`,
  };
}
