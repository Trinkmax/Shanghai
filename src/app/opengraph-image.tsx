import { ImageResponse } from "next/og";

export const alt = "Shangai Center · Importador mayorista en Córdoba";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TEXTO = "SHANGAI CENTER IMPORTADOR MAYORISTA Más de 1.000 importados a precio mayorista Entre Ríos 258, Córdoba · Pedí online";

/** Archivo expandida (la del cartel) recortada a los caracteres que usa la imagen. Si falla, usa la de sistema. */
async function fuente(peso: number, ancho: number): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@${ancho},${peso}&text=${encodeURIComponent(TEXTO)}`, {
        headers: { "User-Agent": "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1" },
      })
    ).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

/** Imagen para compartir (WhatsApp, redes): el cartel índigo con la caja de la marca. */
export default async function Imagen() {
  const [rotulo, texto] = await Promise.all([fuente(800, 125), fuente(500, 100)]);
  const fonts = [
    ...(rotulo ? [{ name: "Rotulo", data: rotulo, weight: 800 as const, style: "normal" as const }] : []),
    ...(texto ? [{ name: "Texto", data: texto, weight: 500 as const, style: "normal" as const }] : []),
  ];
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          color: "white",
          fontFamily: "Texto",
          background: "radial-gradient(120% 140% at 20% 0%, #5a54b4 0%, #372a84 48%, #241b5e 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <svg width="92" height="92" viewBox="0 0 100 100">
            <path d="M70 18.5 50 7.5 13 28.5 50 49.5 87 28.5 87 71.5 50 92.5 13 71.5 13 43" fill="none" stroke="#cacded" strokeWidth="10" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontFamily: "Rotulo", fontSize: 46, letterSpacing: 1 }}>SHANGAI CENTER</div>
            <div style={{ fontSize: 22, color: "#cacded", letterSpacing: 6, marginTop: 8 }}>IMPORTADOR MAYORISTA</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontFamily: "Rotulo", fontSize: 68, lineHeight: 1.02, maxWidth: 1040, textTransform: "uppercase" }}>
            Más de 1.000 importados a precio mayorista
          </div>
          <div style={{ display: "flex", gap: 18, marginTop: 34, fontSize: 30, color: "#e5e6f7" }}>
            <span>Entre Ríos 258, Córdoba</span>
            <span style={{ color: "#a4a9da" }}>·</span>
            <span>Pedí online</span>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length ? fonts : undefined },
  );
}
