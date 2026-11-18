import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Shangai Center · Importador mayorista",
    short_name: "Shangai Center",
    description: "Catálogo mayorista de Shangai Center, Córdoba. Pedí online y retirá en Entre Ríos 258.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f4f8",
    theme_color: "#372a84",
    lang: "es-AR",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icono-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icono-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
