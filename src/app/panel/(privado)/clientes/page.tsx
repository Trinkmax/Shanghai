import { MessageCircle, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BuscadorURL } from "@/components/panel/BuscadorURL";
import { EstadoVacio, Paginador, PestanasURL, TituloPagina } from "@/components/panel/ui";
import { formatARS, formatNumero, formatTelefono, haceCuanto, linkWhatsApp } from "@/lib/format";
import { requerirPerfil } from "@/lib/panel/sesion";
import { createClient } from "@/lib/supabase/server";

// Pantalla con sesión: puede bloquear en el servidor al navegar (Cache Components).
export const instant = false;

export const metadata: Metadata = { title: "Clientes" };

const POR_PAGINA = 40;
type Params = { q?: string; orden?: string; pagina?: string };

export default async function Clientes({ searchParams }: { searchParams: Promise<Params> }) {
  await requerirPerfil("ver_clientes");
  const sp = await searchParams;
  const pagina = Math.max(1, Number(sp.pagina) || 1);
  const orden = sp.orden === "compras" ? "compras" : sp.orden === "nuevos" ? "nuevos" : "recientes";
  const q = (sp.q ?? "").replace(/[,()*%]/g, " ").trim();
  const supabase = await createClient();

  let c = supabase
    .from("clientes")
    .select("id, nombre, negocio, telefono, email, ciudad, provincia, pedidos_count, total_comprado, ultimo_pedido_en, creado_en", { count: "exact" });
  if (q) c = c.or(`nombre.ilike.*${q}*,negocio.ilike.*${q}*,telefono.ilike.*${q}*,email.ilike.*${q}*,documento.ilike.*${q}*`);
  c =
    orden === "compras"
      ? c.order("total_comprado", { ascending: false })
      : orden === "nuevos"
        ? c.order("creado_en", { ascending: false })
        : c.order("ultimo_pedido_en", { ascending: false, nullsFirst: false });
  const { data, count, error } = await c.range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1);
  if (error) throw new Error(error.message);

  const href = (o: string) => {
    const p = new URLSearchParams();
    if (o !== "recientes") p.set("orden", o);
    if (q) p.set("q", q);
    const s = p.toString();
    return s ? `/panel/clientes?${s}` : "/panel/clientes";
  };

  return (
    <>
      <TituloPagina
        titulo="Clientes"
        descripcion="Se suman solos cuando alguien hace un pedido (se reconocen por el teléfono). Acá ves cuánto compra cada uno."
      />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <PestanasURL
          activa={orden}
          opciones={[
            { id: "recientes", texto: "Compraron hace poco", href: href("recientes") },
            { id: "compras", texto: "Más compran", href: href("compras") },
            { id: "nuevos", texto: "Nuevos", href: href("nuevos") },
          ]}
        />
        <Suspense fallback={<div className="esqueleto h-11 w-full lg:w-80" />}>
          <BuscadorURL placeholder="Nombre, negocio, teléfono o email" className="w-full lg:w-80" />
        </Suspense>
      </div>

      <section className="overflow-hidden rounded-[var(--radius-pane)] border border-aluminio bg-white">
        {!data?.length ? (
          <EstadoVacio
            icono={<Users />}
            titulo={q ? `No encontramos clientes para “${q}”` : "Todavía no hay clientes"}
            texto={q ? "Probá con el teléfono o el nombre del negocio." : "Aparecen solos con el primer pedido de la tienda o una venta de mostrador con teléfono."}
          />
        ) : (
          <ul className="divide-y divide-aluminio">
            {data.map((cl) => (
              <li key={cl.id} className="relative flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 hover:bg-vidrio sm:px-5">
                <Link href={`/panel/clientes/${cl.id}`} className="absolute inset-0" aria-label={`Abrir ficha de ${cl.nombre}`} />
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-marca-50 text-sm font-bold text-marca-800">
                  {cl.nombre
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((x) => x[0]?.toUpperCase())
                    .join("")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.95rem] font-medium text-tinta">
                    {cl.negocio ? `${cl.negocio} · ` : ""}
                    {cl.nombre}
                  </p>
                  <p className="tabular truncate text-[0.8rem] text-tinta-3">
                    {cl.telefono ? formatTelefono(cl.telefono) : "Sin teléfono"}
                    {[cl.ciudad, cl.provincia].filter(Boolean).length > 0 && ` · ${[cl.ciudad, cl.provincia].filter(Boolean).join(", ")}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="tabular text-[0.95rem] font-bold text-tinta">{formatARS(cl.total_comprado)}</p>
                  <p className="text-[0.76rem] text-tinta-3">
                    {formatNumero(cl.pedidos_count)} pedido{cl.pedidos_count === 1 ? "" : "s"}
                    {cl.ultimo_pedido_en && ` · ${haceCuanto(cl.ultimo_pedido_en)}`}
                  </p>
                </div>
                {cl.telefono && (
                  <a
                    href={linkWhatsApp(cl.telefono, `¡Hola ${cl.nombre.split(" ")[0]}! Te escribimos de Shangai Center.`)}
                    target="_blank"
                    rel="noreferrer"
                    className="relative z-[1] grid size-10 shrink-0 place-items-center rounded-xl text-verde hover:bg-[#e2f4ea]"
                    aria-label={`WhatsApp a ${cl.nombre}`}
                  >
                    <MessageCircle className="size-5" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      <Paginador pagina={pagina} total={count ?? 0} porPagina={POR_PAGINA} base="/panel/clientes" params={{ q: q || undefined, orden: orden === "recientes" ? undefined : orden }} />
    </>
  );
}
