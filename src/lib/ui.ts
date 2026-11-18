"use client";

import { create } from "zustand";

type EstadoUI = {
  buscador: boolean;
  rubros: boolean;
  encendido: number;
  abrirBuscador: () => void;
  cerrarBuscador: () => void;
  setBuscador: (v: boolean) => void;
  setRubros: (v: boolean) => void;
  /** Vuelve a "encender" el cartel (al llegar a la compra mínima). */
  encender: () => void;
};

export const useUI = create<EstadoUI>()((set) => ({
  buscador: false,
  rubros: false,
  encendido: 0,
  abrirBuscador: () => set({ buscador: true }),
  cerrarBuscador: () => set({ buscador: false }),
  setBuscador: (v) => set({ buscador: v }),
  setRubros: (v) => set({ rubros: v }),
  encender: () => set((s) => ({ encendido: s.encendido + 1 })),
}));
