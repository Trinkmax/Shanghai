import { ClipboardList, Store } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BuscadorURL } from "@/components/panel/BuscadorURL";
import { BotonSiguiente } from "@/components/panel/pedidos/AccionesPedido";
import { ChipCanal, ChipEstado, ChipPago, EstadoVacio, Paginador, PestanasURL, TituloPagina } from "@/components/panel/ui";
import { Boton } from "@/components/ui/Boton";
import { formatARS, formatFechaHora, haceCuanto, plural } from "@/lib/format";
import { VISTAS, type Vista } from "@/lib/panel/pedidos";
import { requerirPerfil } from "@/lib/panel/sesion";
import { createClient } from "@/lib/supabase/server";
import { TEXTO_METODO_PAGO } from "@/lib/tienda";

// Pantalla con sesión: puede bloquear en el servidor al navegar (Cache Components).
export const instant = false;

export const metadata: Metadata = { title: "Pedidos" };

const POR_PAGINA = 30;
const ACTIVOS = ["pendiente", "confirmado", "preparando", "listo"];

type Params = { vista?: string; q?: string; pagina?: string };

type Consulta = ReturnType<Awaited<ReturnType<typeof createClient>>["from"]>;

function aplicarVista<T extends { in: Consulta["in"]; eq: Consulta["eq"] }>(q: T, vista: Vista): T {
  switch (vista) {
    case "activos":
      return q.in("estado", ACTIVOS) as T;
    case "sin_pagar":
      return (q.eq("estado", "pendiente") as T).in("estado_pago", ["pendiente", "rechazado", "en_proceso"]) as T;
    case "preparar":
      return q.in("estado", ["confirmado", "preparando"]) as T;
    case "listos":
      return q.in("estado", ["listo", "enviado"]) as T;
    case "entregados":
      return q.eq("estado", "entregado") as T;
    case "cancelados":
      return q.eq("estado", "cancelado") as T;
    default:
      return q;
  }
}

export default async function Pedidos({ searchParams }: { searchParams: Promise<Params> }) {
  await requerirPerfil("ver_pedidos");
  const sp = await searchParams;
  const vista: Vista = VISTAS.some((v) => v.id === sp.vista) ? (sp.vista as Vista) : "activos";
  const pagina = Math.max(1, Number(sp.pagina) || 1);
  const q = (sp.q ?? "").replace(/[,()*%]/g, " ").trim();
  const supabase = await createClient();

  let consulta = supabase
    .from("pedidos")
    .select(
      "id, numero, token, canal, estado, estado_pago, metodo_pago, entrega_metodo, entrega_nombre, cliente_nombre, cliente_negocio, cliente_telefono, total, items_count, creado_en",
      { count: "exact" },
    );
  consulta = aplicarVista(consulta, vista);
  if (vista !== "todos" && vista !== "entregados") consulta = consulta.neq("canal", "mostrador");
  if (q) {
    consulta = /^\d{1,7}$/.test(q)
      ? consulta.or(`numero.eq.${q},cliente_telefono.ilike.*${q}*`)
      : consulta.or(`cliente_nombre.ilike.*${q}*,cliente_negocio.ilike.*${q}*,cliente_telefono.ilike.*${q}*,cliente_email.ilike.*${q}*`);
  }
  const [{ data: pedidos, count, error }, ...conteos] = await Promise.all([
    consulta.order("creado_en", { ascending: false }).range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1),
    ...(["activos", "sin_pagar", "preparar", "listos"] as Vista[]).map((v) =>
      aplicarVista(supabase.from("pedidos").select("id", { count: "exact", head: true }), v).neq("canal", "mostrador"),
    ),
  ]);
  if (error) throw new Error(error.message);
  const cantidades: Partial<Record<Vista, number>> = {
    activos: conteos[0].count ?? 0,
    sin_pagar: conteos[1].count ?? 0,
    preparar: conteos[2].count ?? 0,
    listos: conteos[3].count ?? 0,
  };

  const href = (v: Vista) => {
    const p = new URLSearchParams();
    if (v !== "activos") p.set("vista", v);
    if (q) p.set("q", q);
    const s = p.toString();
    return s ? `/panel/pedidos?${s}` : "/panel/pedidos";
  };

  return (
    <>
      <TituloPagina
        titulo="Pedidos"
        descripcion="Los pedidos nuevos de la tienda aparecen solos, sin recargar."
        acciones={
          <Boton asChild variante="claro">
            <Link href="/panel/mostrador">
              <Store className="size-4" /> Venta en el local
            </Link>
          </Boton>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <PestanasURL
          activa={vista}
          opciones={VISTAS.map((v) => ({ id: v.id, texto: v.texto, href: href(v.id), cantidad: cantidades[v.id] }))}
        />
        <Suspense fallback={<div className="esqueleto h-11 w-full lg:w-80" />}>
          <BuscadorURL placeholder="Buscar por número, nombre o teléfono" className="w-full lg:w-80" />
        </Suspense>
      </div>

      <section className="overflow-hidden rounded-[var(--radius-pane)] border border-aluminio bg-white">
        {!pedidos?.length ? (
          <EstadoVacio
            icono={<ClipboardList />}
            titulo={q ? `No encontramos pedidos para “${q}”` : vista === "activos" ? "No hay pedidos activos" : "No hay pedidos acá"}
            texto={q ? "Probá con el número de pedido o el teléfono del cliente." : "Cuando entre un pedido de la tienda, aparece acá en el momento."}
          />
        ) : (
          <ul className="divide-y divide-aluminio">
            {pedidos.map((p) => (
              <li key={p.id} className="relative flex flex-col gap-3 px-4 py-3.5 transition-colors hover:bg-vidrio sm:flex-row sm:items-center sm:gap-4 sm:px-5">
                <Link href={`/panel/pedidos/${p.numero}`} className="absolute inset-0" aria-label={`Abrir pedido ${p.numero}`} />
                <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
                  <span className="tabular w-16 shrink-0 text-[1rem] font-bold text-tinta">#{p.numero}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.95rem] font-medium text-tinta">
                      {p.cliente_negocio ? `${p.cliente_negocio} · ` : ""}
                      {p.cliente_nombre}
                    </p>
                    <p className="mt-0.5 text-[0.8rem] text-tinta-3">
                      <span title={formatFechaHora(p.creado_en)}>{haceCuanto(p.creado_en)}</span> · {plural(p.items_count, "unidad", "unidades")} ·{" "}
                      {p.entrega_nombre} · {TEXTO_METODO_PAGO[p.metodo_pago]}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  {p.canal !== "web" && <ChipCanal canal={p.canal} />}
                  <ChipEstado estado={p.estado} />
                  <ChipPago estado={p.estado_pago} />
                  <span className="tabular ml-auto min-w-[6.5rem] text-right text-[1rem] font-bold text-tinta sm:ml-2">{formatARS(p.total)}</span>
                  <span className="relative z-[1]">
                    <BotonSiguiente compacto pedido={{ ...p, total: Number(p.total) }} />
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <Paginador pagina={pagina} total={count ?? 0} porPagina={POR_PAGINA} base="/panel/pedidos" params={{ vista: vista === "activos" ? undefined : vista, q: q || undefined }} />
    </>
  );
}
