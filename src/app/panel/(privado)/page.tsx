import { AlertTriangle, ArrowRight, ClipboardList, Clock, PackageOpen, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GraficoVentas } from "@/components/panel/GraficoVentas";
import { ChipEstado, ChipPago, Dato, EstadoVacio, Tarjeta, TituloPagina } from "@/components/panel/ui";
import { ImagenProducto } from "@/components/ui/ImagenProducto";
import type { EstadoPago, EstadoPedido } from "@/lib/database.types";
import { formatARS, formatNumero, haceCuanto } from "@/lib/format";
import { RANGOS, rangoFechas, type Rango } from "@/lib/panel/fechas";
import { puede } from "@/lib/panel/permisos";
import { requerirPerfil } from "@/lib/panel/sesion";
import { createClient } from "@/lib/supabase/server";
import { TEXTO_METODO_PAGO } from "@/lib/tienda";
import { cn } from "@/lib/utils";

// Pantalla con sesión: puede bloquear en el servidor al navegar (Cache Components).
export const instant = false;

export const metadata: Metadata = { title: "Resumen" };

type Resumen = {
  ventas: number;
  pedidos: number;
  unidades: number;
  ticket_promedio: number;
  web: number;
  mostrador: number;
  por_dia: { dia: string; total: number; pedidos: number }[];
  por_metodo: Record<string, number>;
  top: { producto_id: string | null; nombre: string; codigo: string; imagen: string | null; unidades: number; total: number }[];
  pendientes: number;
  sin_pagar: number;
};

export default async function Resumen({ searchParams }: { searchParams: Promise<{ rango?: string }> }) {
  const perfil = await requerirPerfil();
  if (!puede(perfil.rol, "ver_resumen")) redirect("/panel/pedidos");

  const { rango: r } = await searchParams;
  const rango: Rango = RANGOS.some((x) => x.id === r) ? (r as Rango) : "7d";
  const { desde, hasta } = await rangoFechas(rango);
  const supabase = await createClient();

  const [resumen, stockBajo, ultimos, porPreparar] = await Promise.all([
    supabase.rpc("resumen_ventas", { p_desde: desde, p_hasta: hasta }),
    supabase
      .from("productos")
      .select("id, nombre, codigo, stock, imagenes")
      .eq("activo", true)
      .not("stock", "is", null)
      .lte("stock", 5)
      .order("stock")
      .limit(8),
    supabase
      .from("pedidos")
      .select("id, numero, cliente_nombre, cliente_negocio, total, estado, estado_pago, creado_en")
      .neq("canal", "mostrador")
      .order("creado_en", { ascending: false })
      .limit(6),
    supabase.from("pedidos").select("id", { count: "exact", head: true }).in("estado", ["confirmado", "preparando"]),
  ]);
  if (resumen.error) throw new Error(resumen.error.message);
  const d = resumen.data as unknown as Resumen;
  const metodos = Object.entries(d.por_metodo ?? {}).sort((a, b) => b[1] - a[1]);
  const maxMetodo = Math.max(1, ...metodos.map(([, v]) => Number(v)));
  const textoRango = RANGOS.find((x) => x.id === rango)!.texto.toLowerCase();

  return (
    <>
      <TituloPagina
        titulo="Resumen"
        descripcion={`Hola, ${perfil.nombre.split(" ")[0]}. Así vienen las ventas confirmadas (${textoRango}).`}
        acciones={
          <nav className="flex rounded-xl border border-aluminio bg-white p-1" aria-label="Período">
            {RANGOS.map((x) => (
              <Link
                key={x.id}
                href={x.id === "7d" ? "/panel" : `/panel?rango=${x.id}`}
                aria-current={x.id === rango ? "page" : undefined}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-tinta-2 hover:text-tinta aria-[current=page]:bg-marca-700 aria-[current=page]:text-white"
              >
                {x.texto}
              </Link>
            ))}
          </nav>
        }
      />

      <section className="vidriera grid grid-cols-2 lg:grid-cols-4" aria-label="Números del período">
        <Dato etiqueta="Ventas" valor={formatARS(d.ventas)} detalle={`Web ${formatARS(d.web)} · Local ${formatARS(d.mostrador)}`} className="border-b border-r border-aluminio lg:border-b-0" />
        <Dato etiqueta="Pedidos confirmados" valor={formatNumero(d.pedidos)} className="border-b border-aluminio lg:border-b-0 lg:border-r" />
        <Dato etiqueta="Ticket promedio" valor={formatARS(d.ticket_promedio)} className="border-r border-aluminio" />
        <Dato etiqueta="Unidades vendidas" valor={formatNumero(d.unidades)} />
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Tarjeta titulo="Ventas por día" descripcion="Pedidos confirmados y ventas de mostrador">
          <GraficoVentas datos={d.por_dia} />
        </Tarjeta>

        <Tarjeta titulo="Para hacer" cuerpo={false}>
          <ul className="divide-y divide-aluminio">
            {[
              { href: "/panel/pedidos?vista=sin_pagar", icono: Wallet, texto: "Esperando pago", n: d.sin_pagar, tono: "text-ambar-tinta bg-[#fff3cc]" },
              { href: "/panel/pedidos?vista=preparar", icono: PackageOpen, texto: "Para preparar", n: porPreparar.count ?? 0, tono: "text-[#1a5a96] bg-[#e5f0fb]" },
              { href: "/panel/pedidos", icono: ClipboardList, texto: "Pedidos activos", n: d.pendientes, tono: "text-marca-800 bg-marca-50" },
            ].map((t) => (
              <li key={t.texto}>
                <Link href={t.href} className="group flex items-center gap-3 px-4 py-3.5 hover:bg-vidrio sm:px-5">
                  <span className={cn("grid size-10 place-items-center rounded-xl", t.tono)}>
                    <t.icono className="size-5" />
                  </span>
                  <span className="flex-1 text-[0.95rem] font-medium text-tinta">{t.texto}</span>
                  <span className="tabular text-xl font-bold text-tinta">{t.n}</span>
                  <ArrowRight className="size-4 text-tinta-3 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
          {stockBajo.data && stockBajo.data.length > 0 && (
            <div className="border-t border-aluminio px-4 py-3.5 sm:px-5">
              <p className="flex items-center gap-2 text-[0.88rem] font-semibold text-tinta">
                <AlertTriangle className="size-4 text-ambar-2" /> Poco stock
              </p>
              <ul className="mt-2.5 space-y-2">
                {stockBajo.data.map((p) => (
                  <li key={p.id}>
                    <Link href={`/panel/productos/${p.id}`} className="flex items-center gap-2.5 text-[0.88rem] hover:underline">
                      <ImagenProducto ruta={p.imagenes[0]} alt="" className="size-8 shrink-0 rounded-lg border border-aluminio" />
                      <span className="min-w-0 flex-1 truncate text-tinta">{p.nombre}</span>
                      <span className={cn("tabular font-bold", p.stock === 0 ? "text-rojo" : "text-ambar-tinta")}>
                        {p.stock === 0 ? "Agotado" : `${p.stock} u.`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Tarjeta>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Tarjeta titulo="Lo más vendido del período" cuerpo={false}>
          {d.top.length === 0 ? (
            <EstadoVacio titulo="Sin ventas en este período" texto="Cuando se confirmen pedidos, acá vas a ver qué productos salen más." />
          ) : (
            <ol className="divide-y divide-aluminio">
              {d.top.map((t, i) => (
                <li key={`${t.producto_id}-${i}`} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                  <span className="rotulo tabular w-6 text-center text-[0.95rem] text-marca-300">{i + 1}</span>
                  <ImagenProducto ruta={t.imagen} alt="" className="size-10 shrink-0 rounded-lg border border-aluminio" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.9rem] font-medium text-tinta">{t.nombre}</span>
                    <span className="tabular text-[0.75rem] text-tinta-3">Cód. {t.codigo}</span>
                  </span>
                  <span className="text-right">
                    <span className="tabular block text-[0.92rem] font-bold text-tinta">{formatNumero(t.unidades)} u.</span>
                    <span className="tabular text-[0.75rem] text-tinta-3">{formatARS(t.total)}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Tarjeta>

        <div className="grid gap-4">
          <Tarjeta titulo="Medios de pago">
            {metodos.length === 0 ? (
              <p className="text-[0.92rem] text-tinta-3">Sin cobros en este período.</p>
            ) : (
              <ul className="space-y-3">
                {metodos.map(([m, v]) => (
                  <li key={m}>
                    <div className="flex items-baseline justify-between text-[0.9rem]">
                      <span className="text-tinta">{TEXTO_METODO_PAGO[m as keyof typeof TEXTO_METODO_PAGO] ?? m}</span>
                      <span className="tabular font-semibold text-tinta">{formatARS(v)}</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-vidrio-2">
                      <div className="h-full rounded-full bg-marca-500" style={{ width: `${(Number(v) / maxMetodo) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Tarjeta>

          <Tarjeta
            titulo="Últimos pedidos de la web"
            accion={
              <Link href="/panel/pedidos" className="text-sm font-semibold text-marca-700 hover:underline">
                Ver todos
              </Link>
            }
            cuerpo={false}
          >
            {!ultimos.data?.length ? (
              <EstadoVacio
                icono={<Clock />}
                titulo="Todavía no entraron pedidos"
                texto="Cuando un cliente compre en la tienda, te avisamos acá en el momento."
              />
            ) : (
              <ul className="divide-y divide-aluminio">
                {ultimos.data.map((p) => (
                  <li key={p.id}>
                    <Link href={`/panel/pedidos/${p.numero}`} className="flex items-center gap-3 px-4 py-3 hover:bg-vidrio sm:px-5">
                      <span className="tabular w-14 shrink-0 text-[0.9rem] font-bold text-tinta">#{p.numero}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.9rem] text-tinta">{p.cliente_negocio || p.cliente_nombre}</span>
                        <span className="text-[0.75rem] text-tinta-3">{haceCuanto(p.creado_en)}</span>
                      </span>
                      <span className="hidden flex-col items-end gap-1 sm:flex">
                        <ChipEstado estado={p.estado as EstadoPedido} />
                      </span>
                      <span className="flex flex-col items-end gap-1">
                        <span className="tabular text-[0.92rem] font-bold text-tinta">{formatARS(p.total)}</span>
                        <ChipPago estado={p.estado_pago as EstadoPago} className="sm:hidden" />
                      </span>
                    </Link>
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
