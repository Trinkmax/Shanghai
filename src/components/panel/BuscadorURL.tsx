"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { cn } from "@/lib/utils";

/** Campo de búsqueda que escribe ?q= en la URL (con espera corta) y vuelve a la página 1. */
export function BuscadorURL({ placeholder, className, parametro = "q" }: { placeholder: string; className?: string; parametro?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [texto, setTexto] = useState(params.get(parametro) ?? "");
  const [pendiente, empezar] = useTransition();
  const t = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [enfocado, setEnfocado] = useState(false);
  // Si la URL cambia desde afuera (pestañas, atrás/adelante), el campo la refleja; mientras se tipea, no se pisa.
  const actual = params.get(parametro) ?? "";
  const [actualPrevio, setActualPrevio] = useState(actual);
  if (actual !== actualPrevio) {
    setActualPrevio(actual);
    if (!enfocado) setTexto(actual);
  }

  function aplicar(v: string) {
    const q = new URLSearchParams(params.toString());
    if (v.trim()) q.set(parametro, v.trim());
    else q.delete(parametro);
    q.delete("pagina");
    const s = q.toString();
    empezar(() => router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false }));
  }

  return (
    <div className={cn("relative", className)}>
      <Search className={cn("pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2", pendiente ? "animate-pulse text-marca-500" : "text-tinta-3")} />
      <input
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          clearTimeout(t.current);
          const v = e.target.value;
          t.current = setTimeout(() => aplicar(v), 300);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            clearTimeout(t.current);
            aplicar(texto);
          }
        }}
        onFocus={() => setEnfocado(true)}
        onBlur={() => setEnfocado(false)}
        placeholder={placeholder}
        className="campo h-11 pl-10 pr-10"
        aria-label={placeholder}
        type="search"
      />
      {texto && (
        <button
          type="button"
          onClick={() => {
            setTexto("");
            aplicar("");
          }}
          className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-tinta-3 hover:bg-vidrio"
          aria-label="Borrar búsqueda"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
