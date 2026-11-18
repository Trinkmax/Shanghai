import type { RolPersonal } from "@/lib/database.types";

/** Qué puede hacer cada rol en el panel (se usa en servidor y en navegador). */
export type Permiso =
  | "ver_resumen"
  | "ver_pedidos"
  | "gestionar_pedidos"
  | "mostrador"
  | "ver_productos"
  | "editar_catalogo"
  | "ver_clientes"
  | "editar_portada"
  | "ajustes"
  | "mercadopago_ver"
  | "mercadopago_cambiar"
  | "equipo";

const MATRIZ: Record<RolPersonal, Permiso[]> = {
  dueno: [
    "ver_resumen",
    "ver_pedidos",
    "gestionar_pedidos",
    "mostrador",
    "ver_productos",
    "editar_catalogo",
    "ver_clientes",
    "editar_portada",
    "ajustes",
    "mercadopago_ver",
    "mercadopago_cambiar",
    "equipo",
  ],
  encargado: [
    "ver_resumen",
    "ver_pedidos",
    "gestionar_pedidos",
    "mostrador",
    "ver_productos",
    "editar_catalogo",
    "ver_clientes",
    "editar_portada",
    "ajustes",
    "mercadopago_ver",
  ],
  vendedor: ["ver_pedidos", "gestionar_pedidos", "mostrador", "ver_productos", "ver_clientes"],
};

export const puede = (rol: RolPersonal | null | undefined, permiso: Permiso) => (rol ? MATRIZ[rol].includes(permiso) : false);

export const NOMBRE_ROL: Record<RolPersonal, string> = {
  dueno: "Dueño",
  encargado: "Encargado",
  vendedor: "Vendedor",
};

export const DESCRIPCION_ROL: Record<RolPersonal, string> = {
  dueno: "Todo el panel, incluidos el equipo y Mercado Pago.",
  encargado: "Pedidos, mostrador, catálogo, portada y ajustes de la tienda.",
  vendedor: "Pedidos, ventas de mostrador y consulta del catálogo.",
};
