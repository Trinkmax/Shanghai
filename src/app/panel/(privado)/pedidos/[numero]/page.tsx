import { AlertTriangle, MapPin, Phone, StickyNote, Truck, User } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AccionesPedido, FormNota } from "@/components/panel/pedidos/AccionesPedido";
import { ChipCanal, ChipEstado, ChipPago, Tarjeta, TituloPagina } from "@/components/panel/ui";
import { ImagenProducto } from "@/components/ui/ImagenProducto";
import { formatARS, formatFechaHora, formatFechaLarga, formatTelefono, formatHora, plural } from "@/lib/format";
import { puede } from "@/lib/panel/permisos";
import { requerirPerfil } from "@/lib/panel/sesion";
import { createClient } from "@/lib/supabase/server";
import { TEXTO_METODO_PAGO } from "@/lib/tienda";
import { cn } from "@/lib/utils";

// Pantalla con sesión: puede bloquear en el servidor al navegar (Cache Components).
export const instant = false;

export const metadata: Metadata = { title: "Pedido" };

type Direccion = { calle?: string; ciudad?: string; provincia?: string; cp?: string; referencias?: string } | null;

const PUNTO_EVENTO: Record<string, string> = {
  creado: "bg-marca-500",
  estado: "bg-marca-700",
  pago: "bg-verde",
  nota: "bg-ambar-2",
};

export default async function DetallePedido({ params }: { params: Promise<{ numero: string }> }) {
  const perfil = await requerirPerfil("ver_pedidos");
  const { numero } = await params;
  if (!/^\d+$/.test(numero)) notFound();
  const supabase = await createClient();

  const { data: p } = await supabase.from("pedidos").select("*").eq("numero", Number(numero)).maybeSingle();
  if (!p) notFound();

  const [items, eventos, pagos, config] = await Promise.all([
    supabase.from("pedido_items").select("*").eq("pedido_id", p.id).order("id"),
    supabase.from("pedido_eventos").select("*").eq("pedido_id", p.id).order("creado_en", { ascending: false }),
    puede(perfil.rol, "ver_resumen")
      ? supabase.from("pagos").select("*").eq("pedido_id", p.id).order("creado_en", { ascending: false })
      : Promise.resolve({ data: [] as never[] }),
    supabase.from("configuracion").select("direccion").eq("id", true).single(),
  ]);
  const dir = p.entrega_direccion as Direccion;
  const sinPagarMP = p.metodo_pago === "mercadopago" && p.estado_pago !== "aprobado" && p.estado !== "cancelado";

  return (
    <>
      <TituloPagina
        volver={{ href: "/panel/pedidos", texto: "Pedidos" }}
        titulo={
          <span className="flex flex-wrap items-center gap-3">
            <span className="tabular">Pedido #{p.numero}</span>
            <ChipEstado estado={p.estado} className="text-[0.75rem]" />
            <ChipPago estado={p.estado_pago} className="text-[0.75rem]" />
            {p.canal !== "web" && <ChipCanal canal={p.canal} />}
          </span>
        }
        descripcion={
          <span className="capitalize">
            {formatFechaLarga(p.creado_en)} · {formatHora(p.creado_en)} h
          </span>
        }
      />

      {puede(perfil.rol, "gestionar_pedidos") && (
        <div className="mb-5">
          <AccionesPedido
            pedido={{
              id: p.id,
              numero: p.numero,
              token: p.token,
              estado: p.estado,
              estado_pago: p.estado_pago,
              metodo_pago: p.metodo_pago,
              entrega_metodo: p.entrega_metodo,
              cliente_nombre: p.cliente_nombre,
              cliente_telefono: p.cliente_telefono,
              total: Number(p.total),
            }}
            direccion={config.data?.direccion ?? ""}
          />
          {sinPagarMP && (
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-[#fff7dc] px-3.5 py-2.5 text-[0.88rem] text-ambar-tinta">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              El cliente eligió Mercado Pago y el pago todavía no se acreditó. El estado se actualiza solo cuando Mercado Pago avisa.
            </p>
          )}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Tarjeta titulo="Productos" descripcion={plural(p.items_count, "unidad", "unidades")} cuerpo={false}>
            <ul className="divide-y divide-aluminio">
              {(items.data ?? []).map((it) => (
                <li key={it.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  <ImagenProducto ruta={it.imagen} alt="" className="size-14 shrink-0 rounded-xl border border-aluminio" />
                  <div className="min-w-0 flex-1">
                    {it.producto_id ? (
                      <Link href={`/panel/productos/${it.producto_id}`} className="line-clamp-2 text-[0.93rem] font-medium text-tinta hover:underline">
                        {it.nombre}
                      </Link>
                    ) : (
                      <p className="line-clamp-2 text-[0.93rem] font-medium text-tinta">{it.nombre}</p>
                    )}
                    <p className="tabular mt-0.5 text-[0.78rem] text-tinta-3">
                      Cód. {it.codigo} · {formatARS(it.precio_unitario)} c/u
                    </p>
                  </div>
                  <span className="tabular w-14 shrink-0 text-center text-[1.05rem] font-bold text-tinta">×{it.cantidad}</span>
                  <span className="tabular w-24 shrink-0 text-right text-[0.95rem] font-semibold text-tinta">{formatARS(it.subtotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="space-y-1.5 border-t border-aluminio bg-vidrio/60 px-4 py-4 text-[0.92rem] sm:px-5">
              <div className="flex justify-between">
                <dt className="text-tinta-2">Subtotal</dt>
                <dd className="tabular text-tinta">{formatARS(p.subtotal)}</dd>
              </div>
              {Number(p.descuento) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-tinta-2">Descuento</dt>
                  <dd className="tabular text-verde">− {formatARS(p.descuento)}</dd>
                </div>
              )}
              {p.entrega_metodo !== "retiro" && (
                <div className="flex justify-between">
                  <dt className="text-tinta-2">Envío</dt>
                  <dd className="tabular text-tinta">{p.costo_envio == null ? "A coordinar" : formatARS(p.costo_envio)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-aluminio pt-2 text-[1.05rem]">
                <dt className="font-semibold text-tinta">Total</dt>
                <dd className="tabular font-bold text-tinta">{formatARS(p.total)}</dd>
              </div>
            </dl>
          </Tarjeta>

          <Tarjeta titulo="Historial" descripcion="Las notas internas no las ve el cliente.">
            {puede(perfil.rol, "gestionar_pedidos") && <FormNota id={p.id} />}
            <ol className="mt-5 space-y-4">
              {(eventos.data ?? []).map((e) => (
                <li key={e.id} className="relative flex gap-3 pl-1">
                  <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full ring-4 ring-white", PUNTO_EVENTO[e.tipo] ?? "bg-aluminio-2")} />
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-[0.92rem] text-tinta", e.tipo === "nota" && "rounded-lg bg-[#fff7dc] px-2.5 py-1.5")}>
                      {e.tipo === "nota" && <StickyNote className="mr-1.5 inline size-3.5 -translate-y-px text-ambar-2" />}
                      {e.detalle}
                    </p>
                    <p className="mt-0.5 text-[0.76rem] text-tinta-3">
                      {formatFechaHora(e.creado_en)}
                      {e.autor ? ` · ${e.autor}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Tarjeta>
        </div>

        <div className="space-y-4">
          <Tarjeta titulo="Cliente">
            <div className="space-y-2.5 text-[0.92rem]">
              <p className="flex items-start gap-2.5">
                <User className="mt-0.5 size-4 shrink-0 text-tinta-3" />
                <span>
                  <span className="font-semibold text-tinta">{p.cliente_nombre}</span>
                  {p.cliente_negocio && <span className="block text-tinta-2">{p.cliente_negocio}</span>}
                  {p.cliente_documento && <span className="block text-[0.82rem] text-tinta-3">DNI/CUIT {p.cliente_documento}</span>}
                </span>
              </p>
              {p.cliente_telefono && (
                <p className="flex items-center gap-2.5">
                  <Phone className="size-4 shrink-0 text-tinta-3" />
                  <a href={`tel:${p.cliente_telefono}`} className="tabular text-tinta hover:underline">
                    {formatTelefono(p.cliente_telefono)}
                  </a>
                </p>
              )}
              {p.cliente_email && (
                <p className="truncate pl-[26px] text-tinta-2">
                  <a href={`mailto:${p.cliente_email}`} className="hover:underline">
                    {p.cliente_email}
                  </a>
                </p>
              )}
              {p.cliente_id && (
                <Link href={`/panel/clientes/${p.cliente_id}`} className="inline-block pl-[26px] text-[0.88rem] font-semibold text-marca-700 hover:underline">
                  Ver ficha y pedidos anteriores
                </Link>
              )}
            </div>
          </Tarjeta>

          <Tarjeta titulo="Entrega">
            <div className="space-y-2 text-[0.92rem]">
              <p className="flex items-center gap-2.5 font-semibold text-tinta">
                {p.entrega_metodo === "retiro" ? <MapPin className="size-4 text-tinta-3" /> : <Truck className="size-4 text-tinta-3" />}
                {p.entrega_nombre}
              </p>
              {dir && (
                <p className="pl-[26px] text-tinta-2">
                  {[dir.calle, dir.ciudad, dir.provincia, dir.cp && `CP ${dir.cp}`].filter(Boolean).join(", ")}
                  {dir.referencias && <span className="mt-1 block text-[0.85rem] text-tinta-3">{dir.referencias}</span>}
                </p>
              )}
              {p.notas && (
                <p className="mt-3 rounded-xl bg-vidrio px-3 py-2.5 text-[0.88rem] text-tinta-2">
                  <span className="font-semibold text-tinta">Nota del cliente: </span>
                  {p.notas}
                </p>
              )}
            </div>
          </Tarjeta>

          <Tarjeta titulo="Pago">
            <dl className="space-y-2 text-[0.92rem]">
              <div className="flex justify-between gap-3">
                <dt className="text-tinta-2">Medio</dt>
                <dd className="font-medium text-tinta">{TEXTO_METODO_PAGO[p.metodo_pago]}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-tinta-2">Estado</dt>
                <dd>
                  <ChipPago estado={p.estado_pago} />
                </dd>
              </div>
              {p.pagado_en && (
                <div className="flex justify-between gap-3">
                  <dt className="text-tinta-2">Acreditado</dt>
                  <dd className="text-tinta">{formatFechaHora(p.pagado_en)}</dd>
                </div>
              )}
              {p.mp_payment_id && (
                <div className="flex justify-between gap-3">
                  <dt className="text-tinta-2">Nº de operación MP</dt>
                  <dd className="tabular text-tinta">{p.mp_payment_id}</dd>
                </div>
              )}
            </dl>
            {(pagos.data ?? []).length > 0 && (
              <ul className="mt-4 space-y-2 border-t border-aluminio pt-3 text-[0.82rem]">
                {(pagos.data ?? []).map((pg) => (
                  <li key={pg.id} className="flex justify-between gap-3 text-tinta-2">
                    <span className="tabular">
                      #{pg.referencia} · {pg.estado}
                      {pg.medio ? ` · ${pg.medio}` : ""}
                      {pg.cuotas && pg.cuotas > 1 ? ` · ${pg.cuotas} cuotas` : ""}
                    </span>
                    <span className="tabular font-semibold text-tinta">{pg.monto != null ? formatARS(pg.monto) : "—"}</span>
                  </li>
                ))}
              </ul>
            )}
          </Tarjeta>
        </div>
      </div>
    </>
  );
}
