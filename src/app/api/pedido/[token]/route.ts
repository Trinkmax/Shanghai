import { obtenerPedidoPublico } from "@/lib/datos/pedidos";

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const pedido = await obtenerPedidoPublico(token).catch(() => null);
  if (!pedido) return Response.json({ error: "No encontrado" }, { status: 404 });
  return Response.json(pedido, { headers: { "Cache-Control": "no-store" } });
}
