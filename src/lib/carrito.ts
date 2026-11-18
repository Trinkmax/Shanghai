"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/** Lo mínimo que necesita el carrito de un producto. */
export type ProductoParaCarrito = {
  id: string;
  codigo: string;
  slug: string;
  nombre: string;
  imagen: string | null;
  precio_final: number;
  precio_lista: number | null;
  cantidad_minima: number;
  stock: number | null;
};

export type ItemCarrito = {
  id: string;
  codigo: string;
  slug: string;
  nombre: string;
  imagen: string | null;
  precio: number;
  precio_lista: number | null;
  cantidad: number;
  minima: number;
  stock: number | null;
  agregado_en: number;
};

export type CambioPrecio = { nombre: string; antes: number; ahora: number };

type EstadoCarrito = {
  items: ItemCarrito[];
  abierto: boolean;
  /** El primer "vuelo" al carrito enseña dónde queda; después solo late el contador. */
  yaVolo: boolean;
  agregar: (p: ProductoParaCarrito, cantidad?: number) => { cantidad: number; nuevo: boolean; tope: boolean };
  fijar: (id: string, cantidad: number) => void;
  quitar: (id: string) => ItemCarrito | undefined;
  restaurar: (item: ItemCarrito) => void;
  vaciar: () => void;
  abrir: () => void;
  cerrar: () => void;
  marcarVuelo: () => void;
  /** Sincroniza precios/stock con el catálogo vigente. Devuelve los cambios para avisar. */
  sincronizar: (vigentes: Map<string, { p: number; l: number | null; x: number | null; q: number } | null>) => {
    cambios: CambioPrecio[];
    quitados: string[];
  };
};

const tope = (stock: number | null) => (stock == null ? 100000 : Math.max(0, stock));

export const useCarrito = create<EstadoCarrito>()(
  persist(
    (set, get) => ({
      items: [],
      abierto: false,
      yaVolo: false,

      agregar: (p, cantidad) => {
        const existe = get().items.find((i) => i.id === p.id);
        const max = tope(p.stock);
        const paso = Math.max(1, cantidad ?? (existe ? 1 : p.cantidad_minima));
        const deseada = (existe?.cantidad ?? 0) + paso;
        const final = Math.min(max, Math.max(p.cantidad_minima, deseada));
        if (existe) {
          set({ items: get().items.map((i) => (i.id === p.id ? { ...i, cantidad: final, precio: p.precio_final } : i)) });
        } else {
          set({
            items: [
              ...get().items,
              {
                id: p.id,
                codigo: p.codigo,
                slug: p.slug,
                nombre: p.nombre,
                imagen: p.imagen,
                precio: p.precio_final,
                precio_lista: p.precio_lista,
                cantidad: final,
                minima: p.cantidad_minima,
                stock: p.stock,
                agregado_en: Date.now(),
              },
            ],
          });
        }
        return { cantidad: final, nuevo: !existe, tope: deseada > max };
      },

      fijar: (id, cantidad) => {
        const it = get().items.find((i) => i.id === id);
        if (!it) return;
        if (cantidad <= 0) {
          set({ items: get().items.filter((i) => i.id !== id) });
          return;
        }
        const final = Math.min(tope(it.stock), Math.max(it.minima, Math.round(cantidad)));
        set({ items: get().items.map((i) => (i.id === id ? { ...i, cantidad: final } : i)) });
      },

      quitar: (id) => {
        const it = get().items.find((i) => i.id === id);
        set({ items: get().items.filter((i) => i.id !== id) });
        return it;
      },

      restaurar: (item) => {
        if (get().items.some((i) => i.id === item.id)) return;
        set({ items: [...get().items, item].sort((a, b) => a.agregado_en - b.agregado_en) });
      },

      vaciar: () => set({ items: [] }),
      abrir: () => set({ abierto: true }),
      cerrar: () => set({ abierto: false }),
      marcarVuelo: () => set({ yaVolo: true }),

      sincronizar: (vigentes) => {
        const cambios: CambioPrecio[] = [];
        const quitados: string[] = [];
        const items: ItemCarrito[] = [];
        for (const it of get().items) {
          if (!vigentes.has(it.id)) {
            items.push(it);
            continue;
          }
          const v = vigentes.get(it.id);
          if (!v || (v.x !== null && v.x <= 0)) {
            quitados.push(it.nombre);
            continue;
          }
          if (Math.round(v.p) !== Math.round(it.precio)) cambios.push({ nombre: it.nombre, antes: it.precio, ahora: v.p });
          const cantidad = Math.min(tope(v.x), Math.max(v.q, it.cantidad));
          items.push({ ...it, precio: v.p, precio_lista: v.l, stock: v.x, minima: v.q, cantidad });
        }
        set({ items });
        return { cambios, quitados };
      },
    }),
    {
      name: "shangai-carrito-v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items }),
    },
  ),
);

export const subtotalDe = (items: ItemCarrito[]) => items.reduce((t, i) => t + i.precio * i.cantidad, 0);
export const unidadesDe = (items: ItemCarrito[]) => items.reduce((t, i) => t + i.cantidad, 0);

export const useSubtotal = () => useCarrito((s) => subtotalDe(s.items));
export const useUnidades = () => useCarrito((s) => unidadesDe(s.items));
export const useCantidadDe = (id: string) => useCarrito((s) => s.items.find((i) => i.id === id)?.cantidad ?? 0);

/** true cuando el carrito ya se leyó de localStorage (evita parpadeos de hidratación). */
export function useCarritoHidratado() {
  return useSyncExternalStore(
    (cb) => useCarrito.persist.onFinishHydration(cb),
    () => useCarrito.persist.hasHydrated(),
    () => false,
  );
}
