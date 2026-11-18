import { MessageCircle, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FichaCliente } from "@/components/panel/clientes/FichaCliente";
import { ChipEstado, ChipPago, Dato, EstadoVacio, Tarjeta, TituloPagina } from "@/components/panel/ui";
import { Boton } from "@/components/ui/Boton";
import { formatARS, formatFechaCorta, formatNumero, formatTelefono, linkWhatsApp } from "@/lib/format";
import { requerirPerfil } from "@/lib/panel/sesion";
import { createClient } from "@/lib/supabase/server";

// Pantalla con sesión: puede bloquear en el servidor al navegar (Cache Components).
export const instant = false;

export const metadata: Metadata = { title: "Cliente" };

export default async function DetalleCliente({ params }: { params: Promise<{ id: string }> }) {
  await requerirPerfil("ver_clientes");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: c }, { data: pedidos }] = await Promise.all([
    supabase.from("clientes").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("pedidos")
      .select("id, numero, estado, estado_pago, total, items_count, creado_en, canal")
      .eq("cliente_id", id)
      .order("creado_en", { ascending: false })
      .limit(50),
  ]);
  if (!c) notFound();
  const promedio = c.pedidos_count ? Number(c.total_comprado) / c.pedidos_count : 0;

  return (
    <>
      <TituloPagina
        volver={{ href: "/panel/clientes", texto: "Clientes" }}
        titulo={c.negocio || c.nombre}
        descripcion={c.negocio ? c.nombre : c.ciudad ?? undefined}
        acciones={
          c.telefono && (
            <>
              <Boton asChild variante="claro">
                <a href={`tel:${c.telefono}`}>
                  <Phone className="size-4" /> <span className="tabular">{formatTelefono(c.telefono)}</span>
                </a>
              </Boton>
              <Boton asChild variante="wa">
                <a href={linkWhatsApp(c.telefono, `¡Hola ${c.nombre.split(" ")[0]}! Te escribimos de Shangai Center.`)} target="_blank" rel="noreferrer">
                  <MessageCircle className="size-4" /> WhatsApp
                </a>
              </Boton>
            </>
          )
        }
      />
      <section className="vidriera mb-4 grid grid-cols-3" aria-label="Resumen del cliente">
        <Dato etiqueta="Total comprado" valor={formatARS(c.total_comprado)} className="border-r border-aluminio" />
        <Dato etiqueta="Pedidos" valor={formatNumero(c.pedidos_count)} className="border-r border-aluminio" />
        <Dato etiqueta="Ticket promedio" valor={formatARS(promedio)} />
      </section>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Tarjeta titulo="Pedidos" cuerpo={false}>
          {!pedidos?.length ? (
            <EstadoVacio titulo="Sin pedidos" texto="Los pedidos cancelados también aparecen acá." />
          ) : (
            <ul className="divide-y divide-aluminio">
              {pedidos.map((p) => (
                <li key={p.id}>
                  <Link href={`/panel/pedidos/${p.numero}`} className="flex items-center gap-3 px-4 py-3 hover:bg-vidrio sm:px-5">
                    <span className="tabular w-14 font-bold text-tinta">#{p.numero}</span>
                    <span className="min-w-0 flex-1 text-[0.85rem] text-tinta-3">
                      {formatFechaCorta(p.creado_en)} · {p.items_count} u.{p.canal === "mostrador" ? " · local" : ""}
                    </span>
                    <ChipEstado estado={p.estado} />
                    <ChipPago estado={p.estado_pago} className="hidden sm:inline-flex" />
                    <span className="tabular w-24 text-right font-bold text-tinta">{formatARS(p.total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
        <Tarjeta titulo="Ficha">
          <FichaCliente
            cliente={{
              id: c.id,
              nombre: c.nombre,
              negocio: c.negocio,
              email: c.email,
              documento: c.documento,
              ciudad: c.ciudad,
              provincia: c.provincia,
              notas: c.notas,
            }}
          />
        </Tarjeta>
      </div>
    </>
  );
}
