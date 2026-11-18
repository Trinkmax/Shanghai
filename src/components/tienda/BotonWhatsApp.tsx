"use client";

import { usePathname } from "next/navigation";
import { linkWhatsApp } from "@/lib/format";
import { useTienda } from "./ContextoTienda";

function LogoWhatsApp({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M16.04 3C9.06 3 3.4 8.66 3.4 15.63c0 2.23.58 4.4 1.69 6.32L3.3 28.7l6.93-1.82a12.6 12.6 0 0 0 5.8 1.42h.01c6.97 0 12.64-5.66 12.64-12.63S23.01 3 16.04 3Zm0 23.13h-.01a10.5 10.5 0 0 1-5.35-1.47l-.38-.23-4.11 1.08 1.1-4-.25-.41a10.46 10.46 0 0 1-1.6-5.6c0-5.8 4.72-10.5 10.53-10.5 2.81 0 5.45 1.1 7.44 3.08a10.43 10.43 0 0 1 3.08 7.44c0 5.8-4.72 10.6-10.45 10.6Zm5.77-7.87c-.32-.16-1.87-.92-2.16-1.03-.29-.1-.5-.16-.71.16-.21.32-.82 1.03-1 1.24-.19.21-.37.24-.69.08-.32-.16-1.33-.49-2.54-1.57-.94-.84-1.57-1.87-1.76-2.19-.18-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.18.21-.32.32-.53.1-.21.05-.4-.03-.56-.08-.16-.71-1.71-.97-2.34-.26-.62-.52-.53-.71-.54h-.61c-.21 0-.56.08-.85.4-.29.32-1.11 1.08-1.11 2.64 0 1.55 1.14 3.06 1.3 3.27.16.21 2.24 3.42 5.43 4.8.76.33 1.35.52 1.81.67.76.24 1.45.21 2 .13.61-.09 1.87-.77 2.13-1.5.27-.74.27-1.37.19-1.5-.08-.13-.29-.21-.61-.37Z"
      />
    </svg>
  );
}

export function BotonWhatsApp() {
  const { whatsapp } = useTienda();
  const pathname = usePathname();
  if (pathname.startsWith("/checkout") || pathname.startsWith("/pedido")) return null;
  // En la ficha de producto el celular ya tiene su botón de WhatsApp (y la barra de agregar).
  const enFicha = pathname.startsWith("/producto/");
  return (
    <a
      href={linkWhatsApp(whatsapp, "Hola! Me interesa comprar en Shangai Center")}
      target="_blank"
      rel="noreferrer"
      aria-label="Escribinos por WhatsApp"
      className={`presionable fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-3 z-30 grid size-12 place-items-center rounded-full bg-wa text-white shadow-[0_10px_24px_-8px_rgb(37_211_102/0.75),0_2px_6px_rgb(0_0_0/0.12)] transition-transform hover:scale-[1.04] lg:bottom-6 lg:right-6 lg:size-14 motion-safe:animate-[subir_500ms_var(--ease-out)_1.2s_both] ${enFicha ? "max-lg:hidden" : ""}`}
    >
      <LogoWhatsApp className="size-6 lg:size-7" />
    </a>
  );
}
