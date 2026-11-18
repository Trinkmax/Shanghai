import Link from "next/link";
import { notFound } from "next/navigation";
import { Isotipo } from "@/components/marca/Isotipo";
import { BotonImprimir } from "@/components/panel/pedidos/BotonImprimir";
import { formatARS, formatFechaHora, formatTelefono } from "@/lib/format";
import { requerirPerfil } from "@/lib/panel/sesion";
import { createClient } from "@/lib/supabase/server";
import { TEXTO_ESTADO, TEXTO_METODO_PAGO, TEXTO_PAGO } from "@/lib/tienda";

// Pantalla con sesión: puede bloquear en el servidor al navegar (Cache Components).
export const instant = false;

type Direccion = { calle?: string; ciudad?: string; provincia?: string; cp?: string; referencias?: string } | null;

/** Remito / lista de preparación: hoja A4 lista para imprimir y tildar a mano. */
export default async function Remito({ params }: { params: Promise<{ numero: string }> }) {
  await requerirPerfil("ver_pedidos");
  const { numero } = await params;
  if (!/^\d+$/.test(numero)) notFound();
  const supabase = await createClient();
  const { data: p } = await supabase.from("pedidos").select("*").eq("numero", Number(numero)).maybeSingle();
  if (!p) notFound();
  const [{ data: items }, { data: conf }] = await Promise.all([
    supabase.from("pedido_items").select("*").eq("pedido_id", p.id).order("nombre"),
    supabase.from("configuracion").select("nombre_tienda, direccion, ciudad, whatsapp").eq("id", true).single(),
  ]);
  const dir = p.entrega_direccion as Direccion;

  return (
    <div className="mx-auto max-w-[210mm] p-4 sm:p-8 print:p-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href={`/panel/pedidos/${p.numero}`} className="text-sm font-medium text-tinta-3 hover:text-marca-700">
          ← Volver al pedido
        </Link>
        <BotonImprimir />
      </div>

      <article className="rounded-2xl border border-aluminio bg-white p-6 text-[13px] text-tinta sm:p-10 print:rounded-none print:border-0 print:p-0">
        <header className="flex items-start justify-between gap-6 border-b-2 border-tinta pb-5">
          <div className="flex items-center gap-3">
            <Isotipo className="size-11 text-marca-600" />
            <div>
              <p className="rotulo text-[1.15rem] text-marca-700">{conf?.nombre_tienda ?? "Shangai Center"}</p>
              <p className="text-tinta-2">
                {conf?.direccion}, {conf?.ciudad}
              </p>
              {conf?.whatsapp && <p className="tabular text-tinta-2">WhatsApp {formatTelefono(conf.whatsapp)}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-[0.75rem] uppercase tracking-[0.1em] text-tinta-3">Remito · lista de preparación</p>
            <p className="tabular text-[1.6rem] font-bold leading-tight">#{p.numero}</p>
            <p className="tabular text-tinta-2">{formatFechaHora(p.creado_en)}</p>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-6 border-b border-aluminio py-5">
          <div>
            <h2 className="mb-1.5 text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-tinta-3">Cliente</h2>
            <p className="font-semibold">{p.cliente_nombre}</p>
            {p.cliente_negocio && <p>{p.cliente_negocio}</p>}
            {p.cliente_documento && <p>DNI/CUIT {p.cliente_documento}</p>}
            {p.cliente_telefono && <p className="tabular">{formatTelefono(p.cliente_telefono)}</p>}
          </div>
          <div>
            <h2 className="mb-1.5 text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-tinta-3">Entrega y pago</h2>
            <p className="font-semibold">{p.entrega_nombre}</p>
            {dir && <p>{[dir.calle, dir.ciudad, dir.provincia, dir.cp && `CP ${dir.cp}`].filter(Boolean).join(", ")}</p>}
            {dir?.referencias && <p className="text-tinta-2">{dir.referencias}</p>}
            <p className="mt-1">
              {TEXTO_METODO_PAGO[p.metodo_pago]} · {TEXTO_PAGO[p.estado_pago]}
            </p>
            <p className="text-tinta-2">Estado: {TEXTO_ESTADO[p.estado]}</p>
          </div>
        </section>

        <table className="mt-4 w-full border-collapse">
          <thead>
            <tr className="border-b border-tinta text-left text-[0.72rem] uppercase tracking-[0.08em] text-tinta-3">
              <th className="w-8 py-2" aria-label="Preparado" />
              <th className="py-2">Código</th>
              <th className="py-2">Producto</th>
              <th className="py-2 text-right">Cant.</th>
              <th className="py-2 text-right">P. unit.</th>
              <th className="py-2 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {(items ?? []).map((it) => (
              <tr key={it.id} className="border-b border-aluminio align-top">
                <td className="py-2.5">
                  <span className="block size-4 rounded-[4px] border-[1.5px] border-tinta-3" />
                </td>
                <td className="tabular py-2.5 pr-3 font-semibold">{it.codigo}</td>
                <td className="py-2.5 pr-3">{it.nombre}</td>
                <td className="tabular py-2.5 text-right text-[15px] font-bold">{it.cantidad}</td>
                <td className="tabular py-2.5 text-right">{formatARS(it.precio_unitario)}</td>
                <td className="tabular py-2.5 text-right">{formatARS(it.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex justify-end">
          <dl className="w-64 space-y-1">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd className="tabular">{formatARS(p.subtotal)}</dd>
            </div>
            {Number(p.descuento) > 0 && (
              <div className="flex justify-between">
                <dt>Descuento</dt>
                <dd className="tabular">− {formatARS(p.descuento)}</dd>
              </div>
            )}
            {p.entrega_metodo !== "retiro" && (
              <div className="flex justify-between">
                <dt>Envío</dt>
                <dd className="tabular">{p.costo_envio == null ? "A coordinar" : formatARS(p.costo_envio)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t-2 border-tinta pt-1.5 text-[15px] font-bold">
              <dt>Total</dt>
              <dd className="tabular">{formatARS(p.total)}</dd>
            </div>
          </dl>
        </div>

        {p.notas && (
          <p className="mt-6 rounded-lg border border-aluminio p-3">
            <span className="font-semibold">Nota del cliente: </span>
            {p.notas}
          </p>
        )}

        <footer className="mt-12 grid grid-cols-2 gap-10 text-center text-tinta-3">
          <div className="border-t border-tinta-3 pt-2">Preparó</div>
          <div className="border-t border-tinta-3 pt-2">Recibí conforme</div>
        </footer>
      </article>
    </div>
  );
}
