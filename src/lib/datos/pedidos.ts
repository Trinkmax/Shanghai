import "server-only";
import { clientePublico } from "@/lib/supabase/publico";
import type { EstadoPago, EstadoPedido, MetodoEntrega, MetodoPago } from "@/lib/database.types";

export type PedidoPublico = {
  numero: number;
  estado: EstadoPedido;
  estado_pago: EstadoPago;
  metodo_pago: MetodoPago;
  canal: string;
  entrega_metodo: MetodoEntrega;
  entrega_nombre: string;
  entrega_direccion: { calle?: string; ciudad?: string; provincia?: string; cp?: string; referencias?: string } | null;
  cliente_nombre: string;
  cliente_email: string | null;
  subtotal: number;
  descuento: number;
  costo_envio: number | null;
  total: number;
  items_count: number;
  notas: string | null;
  creado_en: string;
  pagado_en: string | null;
  puede_pagar: boolean;
  items: {
    producto_id: string | null;
    codigo: string;
    nombre: string;
    imagen: string | null;
    precio_unitario: number;
    cantidad: number;
    subtotal: number;
    slug: string | null;
    disponible: boolean;
    cantidad_minima: number;
    stock: number | null;
    precio_actual: number | null;
  }[];
  eventos: { tipo: string; estado: string | null; detalle: string | null; creado_en: string }[];
};

const TOKEN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Pedido por su link público (sin cache: el estado cambia). */
export async function obtenerPedidoPublico(token: string): Promise<PedidoPublico | null> {
  if (!TOKEN.test(token)) return null;
  const { data, error } = await clientePublico().rpc("pedido_publico", { p_token: token });
  if (error) throw new Error(error.message);
  return (data as PedidoPublico | null) ?? null;
}
