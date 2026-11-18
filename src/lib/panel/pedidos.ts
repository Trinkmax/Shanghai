import type { EstadoPedido, MetodoEntrega, MetodoPago } from "@/lib/database.types";
import { formatARS } from "@/lib/format";

export type PasoSiguiente = { estado: EstadoPedido; texto: string };

/** El próximo paso natural del pedido (botón principal). */
export function siguientePaso(estado: EstadoPedido, entrega: MetodoEntrega): PasoSiguiente | null {
  switch (estado) {
    case "pendiente":
      return { estado: "confirmado", texto: "Confirmar pedido" };
    case "confirmado":
      return { estado: "preparando", texto: "Empezar a preparar" };
    case "preparando":
      return { estado: "listo", texto: entrega === "retiro" ? "Listo para retirar" : "Listo para despachar" };
    case "listo":
      return entrega === "retiro" ? { estado: "entregado", texto: "Marcar entregado" } : { estado: "enviado", texto: "Marcar despachado" };
    case "enviado":
      return { estado: "entregado", texto: "Marcar entregado" };
    default:
      return null;
  }
}

export const VISTAS = [
  { id: "activos", texto: "Activos" },
  { id: "sin_pagar", texto: "Esperando pago" },
  { id: "preparar", texto: "Para preparar" },
  { id: "listos", texto: "Listos" },
  { id: "entregados", texto: "Entregados" },
  { id: "cancelados", texto: "Cancelados" },
  { id: "todos", texto: "Todos" },
] as const;

export type Vista = (typeof VISTAS)[number]["id"];

/** Mensaje de WhatsApp sugerido según el estado del pedido. */
export function mensajeWhatsApp(p: {
  numero: number;
  cliente_nombre: string;
  estado: EstadoPedido;
  estado_pago: string;
  metodo_pago: MetodoPago;
  entrega_metodo: MetodoEntrega;
  total: number;
  token: string;
  direccion?: string;
}) {
  const nombre = p.cliente_nombre.split(" ")[0];
  const sitio = process.env.NEXT_PUBLIC_SITIO_URL ?? "";
  const link = sitio ? `\nSeguilo acá: ${sitio}/pedido/${p.token}` : "";
  const total = formatARS(p.total);
  let cuerpo: string;
  switch (p.estado) {
    case "pendiente":
      cuerpo =
        p.metodo_pago === "transferencia" && p.estado_pago !== "aprobado"
          ? `recibimos tu pedido #${p.numero} por ${total}. Para confirmarlo, hacé la transferencia y mandanos el comprobante por acá.`
          : `recibimos tu pedido #${p.numero} por ${total}. En breve lo confirmamos.`;
      break;
    case "confirmado":
      cuerpo = `tu pedido #${p.numero} está confirmado. Te avisamos cuando esté listo.`;
      break;
    case "preparando":
      cuerpo = `ya estamos preparando tu pedido #${p.numero}.`;
      break;
    case "listo":
      cuerpo =
        p.entrega_metodo === "retiro"
          ? `tu pedido #${p.numero} ya está listo para retirar${p.direccion ? ` en ${p.direccion}` : ""}.`
          : `tu pedido #${p.numero} está listo y lo despachamos a la brevedad.`;
      break;
    case "enviado":
      cuerpo = `despachamos tu pedido #${p.numero}.`;
      break;
    case "entregado":
      cuerpo = `¡gracias por tu compra! Cualquier cosa sobre el pedido #${p.numero}, escribinos por acá.`;
      break;
    default:
      cuerpo = `te escribimos por tu pedido #${p.numero}.`;
  }
  return `¡Hola ${nombre}! Te escribimos de Shangai Center: ${cuerpo}${link}`;
}
