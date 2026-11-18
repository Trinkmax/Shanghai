import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

const SITIO = process.env.NEXT_PUBLIC_SITIO_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITIO),
  title: {
    default: "Shangai Center · Importador mayorista en Córdoba",
    template: "%s · Shangai Center",
  },
  description:
    "Más de 1.000 productos importados a precio mayorista. Pedí online, pagá con Mercado Pago y retirá en Entre Ríos 258, Córdoba.",
  applicationName: "Shangai Center",
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "Shangai Center",
  },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#372a84",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const CONTRATO = `
THESIS: la tienda es la vidriera del local de Entre Ríos 258 llevada a la web: cartel retroiluminado, letras de vinilo sobre vidrio y productos exhibidos detrás del paño. Rechaza la plantilla de marketplace (cabecera azul + carrusel + grilla de tarjetas con sombra).
OWN-WORLD: vidrio frío #F3F4F8, perfiles de aluminio de 1px, acrílico índigo #372A84/#5C63AA iluminado desde atrás, vinilo ámbar #FFC21A para ofertas, Archivo expandido en versalitas para los rótulos.
STORY: el comprador reconoce el local, ve ofertas, más vendidos y novedades, busca por nombre o código, suma cantidades mirando cómo se llena la caja del mínimo y paga con Mercado Pago o elige otro medio; después sigue el pedido en vivo.
FIRST VIEWPORT: cartel índigo arriba; debajo, la vidriera: rótulo de vinilo + buscador funcionando a la izquierda, productos reales con botón de agregar a la derecha y el calco de la compra mínima en la puerta.
FORM: dirección asignada nº5 (vidriera / cartel de acrílico) · seed cafa9800db4a316722fe7c2dc7e9b279.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR" className={archivo.variable}>
      <body className="min-h-dvh font-sans">
        <div hidden id="contrato-diseno" dangerouslySetInnerHTML={{ __html: `<!--${CONTRATO}-->` }} />
        {children}
        <Toaster
          position="top-center"
          offset={84}
          mobileOffset={{ top: 72 }}
          toastOptions={{
            classNames: {
              toast:
                "!rounded-2xl !border !border-aluminio !bg-white !text-tinta !shadow-[var(--shadow-flotante)] !font-sans",
              title: "!font-semibold",
              description: "!text-tinta-2",
              actionButton: "!bg-marca-700 !text-white !rounded-lg !font-semibold",
            },
          }}
        />
      </body>
    </html>
  );
}
