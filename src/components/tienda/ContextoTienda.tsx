"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Categoria, ConfigTienda } from "@/lib/tienda";

export type DatosTienda = Pick<
  ConfigTienda,
  | "nombre_tienda"
  | "compra_minima"
  | "whatsapp"
  | "direccion"
  | "ciudad"
  | "instagram"
  | "horarios"
  | "envios"
  | "pago_mercadopago"
  | "pago_transferencia"
  | "pago_efectivo"
  | "descuento_transferencia"
  | "mp_conectado"
  | "mapa_url"
> & { categorias: Pick<Categoria, "id" | "slug" | "nombre" | "icono" | "color" | "cantidad">[] };

const Contexto = createContext<DatosTienda | null>(null);

export function ProveedorTienda({ datos, children }: { datos: DatosTienda; children: ReactNode }) {
  return <Contexto.Provider value={datos}>{children}</Contexto.Provider>;
}

export function useTienda(): DatosTienda {
  const c = useContext(Contexto);
  if (!c) throw new Error("useTienda fuera de ProveedorTienda");
  return c;
}
