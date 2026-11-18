"use client";

import { ChevronRight, Heart, Package } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Isotipo } from "@/components/marca/Isotipo";
import { Boton } from "@/components/ui/Boton";
import { useIndice } from "@/hooks/useIndice";
import { useCarritoHidratado } from "@/lib/carrito";
import type { ItemIndice } from "@/lib/datos/catalogo";
import { formatARS, formatFechaHora } from "@/lib/format";
import { useFavoritos, useMisPedidos } from "@/lib/locales";
import { TEXTO_ESTADO, TEXTO_METODO_PAGO, TEXTO_PAGO, type ProductoVista } from "@/lib/tienda";
import type { EstadoPago, EstadoPedido, MetodoPago } from "@/lib/database.types";
import { TarjetaProducto } from "./TarjetaProducto";

/** Producto del índice liviano con la forma que espera la tarjeta. */
export function deIndice(x: ItemIndice): ProductoVista {
  return {
    id: x.i,
    codigo: x.c,
    slug: x.s,
    nombre: x.n,
    precio: x.l ?? x.p,
    precio_oferta: x.l ? x.p : null,
    oferta_hasta: null,
    en_oferta: x.o === 1,
    imagenes: x.m ? [x.m] : [],
    stock: x.x,
    cantidad_minima: x.q,
    es_novedad: x.v === 1,
    ranking_vendidos: null,
    vendidos: 0,
    categoria_id: x.k,
    creado_en: "",
    precio_final: x.p,
    precio_lista: x.l,
    descuento: x.l ? Math.round((1 - x.p / x.l) * 100) : 0,
    oferta: x.o === 1,
    agotado: x.x !== null && x.x <= 0,
  };
}

function Vacio({ icono, titulo, texto, children }: { icono: React.ReactNode; titulo: string; texto: string; children?: React.ReactNode }) {
  return (
    <div className="vidriera flex flex-col items-center px-6 py-16 text-center">
      {icono}
      <p className="mt-5 text-lg font-semibold text-tinta">{titulo}</p>
      <p className="mt-1.5 max-w-[40ch] text-[0.95rem] text-tinta-2">{texto}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">{children}</div>
    </div>
  );
}

export function ListaFavoritos() {
  const hidratado = useCarritoHidratado();
  const ids = useFavoritos((s) => s.ids);
  const { indice, error } = useIndice(true);
  const productos = useMemo(() => {
    if (!indice) return [];
    const mapa = new Map(indice.map((x) => [x.i, x]));
    return ids.map((id) => mapa.get(id)).filter((x): x is ItemIndice => Boolean(x)).map(deIndice);
  }, [indice, ids]);

  if (!hidratado || (!indice && !error && ids.length > 0)) {
    return <div className="esqueleto h-80 w-full rounded-[1.25rem]" />;
  }
  if (ids.length === 0 || productos.length === 0) {
    return (
      <Vacio icono={<Heart className="size-14 text-aluminio-2" strokeWidth={1.5} />} titulo="Todavía no guardaste favoritos" texto="Tocá el corazón de cualquier producto para tenerlo a mano en tu próxima compra.">
        <Boton asChild>
          <Link href="/mas-vendidos">Ver los más vendidos</Link>
        </Boton>
      </Vacio>
    );
  }
  return (
    <div className="vidriera">
      <div className="vidriera-grilla grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        {productos.map((p) => (
          <TarjetaProducto key={p.id} producto={p} />
        ))}
      </div>
    </div>
  );
}

type Estado = { estado: EstadoPedido; estado_pago: EstadoPago };

export function ListaMisPedidos() {
  const hidratado = useCarritoHidratado();
  const pedidos = useMisPedidos((s) => s.pedidos);
  const [estados, setEstados] = useState<Record<string, Estado>>({});

  useEffect(() => {
    let vivo = true;
    pedidos.slice(0, 15).forEach(async (p) => {
      try {
        const r = await fetch(`/api/pedido/${p.token}`, { cache: "no-store" });
        if (!r.ok) return;
        const d = (await r.json()) as Estado;
        if (vivo) setEstados((e) => ({ ...e, [p.token]: { estado: d.estado, estado_pago: d.estado_pago } }));
      } catch {
        /* sin conexión */
      }
    });
    return () => {
      vivo = false;
    };
  }, [pedidos]);

  if (!hidratado) return <div className="esqueleto h-64 w-full rounded-[1.25rem]" />;
  if (pedidos.length === 0) {
    return (
      <Vacio
        icono={<Isotipo className="size-14 text-aluminio" grosor={6} />}
        titulo="Todavía no hiciste pedidos desde este dispositivo"
        texto="Cuando confirmes un pedido lo vas a ver acá, con su estado en vivo."
      >
        <Boton asChild>
          <Link href="/catalogo">Empezar un pedido</Link>
        </Boton>
      </Vacio>
    );
  }
  return (
    <ul className="vidriera divide-y divide-aluminio">
      {pedidos.map((p) => {
        const e = estados[p.token];
        return (
          <li key={p.token}>
            <Link href={`/pedido/${p.token}`} className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-vidrio sm:px-6">
              <span className="cartel relative grid size-11 shrink-0 place-items-center rounded-xl">
                <span className="cartel-luz" />
                <Package className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="tabular block font-semibold text-tinta">Pedido #{p.numero}</span>
                <span className="tabular block text-[0.82rem] text-tinta-3">
                  {formatFechaHora(p.fecha)} · {TEXTO_METODO_PAGO[p.metodo as MetodoPago] ?? p.metodo}
                </span>
              </span>
              <span className="hidden text-right sm:block">
                {e ? (
                  <>
                    <span className="block text-[0.85rem] font-semibold text-tinta">{TEXTO_ESTADO[e.estado]}</span>
                    <span className="block text-[0.78rem] text-tinta-3">{TEXTO_PAGO[e.estado_pago]}</span>
                  </>
                ) : (
                  <span className="esqueleto block h-8 w-24" />
                )}
              </span>
              <span className="tabular shrink-0 font-bold text-tinta">{formatARS(p.total)}</span>
              <ChevronRight className="size-5 shrink-0 text-tinta-3" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
