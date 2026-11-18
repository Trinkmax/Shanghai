"use client";

import { useEffect, useState } from "react";
import type { ItemIndice } from "@/lib/datos/catalogo";

/** Índice liviano del catálogo (para búsqueda instantánea y para revisar precios del pedido). */
let promesa: Promise<ItemIndice[]> | null = null;
let cache: ItemIndice[] | null = null;

export function cargarIndice(forzar = false): Promise<ItemIndice[]> {
  if (!promesa || forzar) {
    promesa = fetch("/api/indice", { cache: forzar ? "no-store" : "default" })
      .then((r) => {
        if (!r.ok) throw new Error("indice");
        return r.json() as Promise<ItemIndice[]>;
      })
      .then((d) => {
        cache = d;
        return d;
      })
      .catch((e) => {
        promesa = null;
        throw e;
      });
  }
  return promesa;
}

export function useIndice(activo = true) {
  const [datos, setDatos] = useState<ItemIndice[] | null>(cache);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!activo || datos) return;
    let vivo = true;
    cargarIndice()
      .then((d) => vivo && setDatos(d))
      .catch(() => vivo && setError(true));
    return () => {
      vivo = false;
    };
  }, [activo, datos]);
  return { indice: datos, error };
}

export function useMediaQuery(q: string) {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const m = window.matchMedia(q);
    const f = () => setOk(m.matches);
    f();
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, [q]);
  return ok;
}
