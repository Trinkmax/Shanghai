"use client";

/** Bus mínimo para coordinar animaciones entre componentes lejanos (tarjeta → cartel). */
export type DetalleAgregado = { origen?: DOMRect | null; imagen?: string | null };

const EVENTO = "shangai:agregado";

export function avisarAgregado(detalle: DetalleAgregado) {
  window.dispatchEvent(new CustomEvent<DetalleAgregado>(EVENTO, { detail: detalle }));
}

export function escucharAgregado(fn: (d: DetalleAgregado) => void) {
  const h = (e: Event) => fn((e as CustomEvent<DetalleAgregado>).detail);
  window.addEventListener(EVENTO, h);
  return () => window.removeEventListener(EVENTO, h);
}

/** Vuelo de la foto hasta el botón del pedido (solo la primera vez: enseña dónde queda). */
export function volarAlCarrito(origen: DOMRect, imagenSrc: string | null) {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const destinos = Array.from(document.querySelectorAll<HTMLElement>("[data-destino-carrito]")).filter(
    (el) => el.offsetParent !== null,
  );
  const destino = destinos[0];
  if (!destino) return;
  const d = destino.getBoundingClientRect();
  const lado = Math.min(origen.width, origen.height, 160);
  const nodo = document.createElement("div");
  Object.assign(nodo.style, {
    position: "fixed",
    left: `${origen.left + origen.width / 2 - lado / 2}px`,
    top: `${origen.top + origen.height / 2 - lado / 2}px`,
    width: `${lado}px`,
    height: `${lado}px`,
    borderRadius: "18px",
    background: imagenSrc ? `#fff url("${imagenSrc}") center/contain no-repeat` : "#5c63aa",
    boxShadow: "0 18px 40px -12px rgb(22 20 44 / .45)",
    zIndex: "9999",
    pointerEvents: "none",
    willChange: "transform, opacity",
  } satisfies Partial<CSSStyleDeclaration>);
  document.body.appendChild(nodo);
  const dx = d.left + d.width / 2 - (origen.left + origen.width / 2);
  const dy = d.top + d.height / 2 - (origen.top + origen.height / 2);
  const anim = nodo.animate(
    [
      { transform: "translate(0,0) scale(1)", opacity: 1 },
      { transform: `translate(${dx * 0.55}px, ${dy * 0.25 - 60}px) scale(0.62)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.16)`, opacity: 0.2 },
    ],
    { duration: 620, easing: "cubic-bezier(0.77, 0, 0.175, 1)" },
  );
  anim.onfinish = () => nodo.remove();
}
