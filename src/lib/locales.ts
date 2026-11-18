"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/** Estado que vive solo en este navegador: favoritos, pedidos hechos y datos para autocompletar. */

type Favoritos = {
  ids: string[];
  alternar: (id: string) => boolean;
  tiene: (id: string) => boolean;
};

export const useFavoritos = create<Favoritos>()(
  persist(
    (set, get) => ({
      ids: [],
      alternar: (id) => {
        const esta = get().ids.includes(id);
        set({ ids: esta ? get().ids.filter((x) => x !== id) : [id, ...get().ids].slice(0, 300) });
        return !esta;
      },
      tiene: (id) => get().ids.includes(id),
    }),
    { name: "shangai-favoritos-v1", storage: createJSONStorage(() => localStorage) },
  ),
);

export type PedidoLocal = { token: string; numero: number; total: number; fecha: string; metodo: string };

type MisPedidos = {
  pedidos: PedidoLocal[];
  guardar: (p: PedidoLocal) => void;
};

export const useMisPedidos = create<MisPedidos>()(
  persist(
    (set, get) => ({
      pedidos: [],
      guardar: (p) => set({ pedidos: [p, ...get().pedidos.filter((x) => x.token !== p.token)].slice(0, 50) }),
    }),
    { name: "shangai-pedidos-v1", storage: createJSONStorage(() => localStorage) },
  ),
);

export type DatosComprador = {
  nombre: string;
  telefono: string;
  email: string;
  negocio: string;
  documento: string;
  entrega: string;
  calle: string;
  ciudad: string;
  provincia: string;
  cp: string;
  referencias: string;
};

const CLAVE_DATOS = "shangai-comprador-v1";

export function leerDatosComprador(): Partial<DatosComprador> | null {
  try {
    const t = localStorage.getItem(CLAVE_DATOS);
    return t ? (JSON.parse(t) as Partial<DatosComprador>) : null;
  } catch {
    return null;
  }
}

export function guardarDatosComprador(d: Partial<DatosComprador>) {
  try {
    localStorage.setItem(CLAVE_DATOS, JSON.stringify(d));
  } catch {
    /* modo privado o almacenamiento lleno: no es crítico */
  }
}

const CLAVE_BUSQUEDAS = "shangai-busquedas-v1";

export function leerBusquedas(): string[] {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_BUSQUEDAS) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export function guardarBusqueda(q: string) {
  const t = q.trim();
  if (t.length < 2) return;
  try {
    const l = [t, ...leerBusquedas().filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, 6);
    localStorage.setItem(CLAVE_BUSQUEDAS, JSON.stringify(l));
  } catch {
    /* no crítico */
  }
}
