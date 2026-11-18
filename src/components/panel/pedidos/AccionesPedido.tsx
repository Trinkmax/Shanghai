"use client";

import { Ban, CheckCircle2, MessageCircle, Printer, Wallet } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Boton } from "@/components/ui/Boton";
import { actualizarPedido } from "@/lib/actions/pedidos";
import type { EstadoPago, EstadoPedido, MetodoEntrega, MetodoPago } from "@/lib/database.types";
import { linkWhatsApp } from "@/lib/format";
import { mensajeWhatsApp, siguientePaso } from "@/lib/panel/pedidos";
import { TEXTO_ESTADO } from "@/lib/tienda";
import { cn } from "@/lib/utils";
import { useConfirmar } from "../Dialogo";

type Pedido = {
  id: string;
  numero: number;
  token: string;
  estado: EstadoPedido;
  estado_pago: EstadoPago;
  metodo_pago: MetodoPago;
  entrega_metodo: MetodoEntrega;
  cliente_nombre: string;
  cliente_telefono: string;
  total: number;
};

/** Botón del próximo paso (también se usa en la lista, compacto). */
export function BotonSiguiente({ pedido, compacto = false }: { pedido: Pedido; compacto?: boolean }) {
  const [pendiente, empezar] = useTransition();
  const paso = siguientePaso(pedido.estado, pedido.entrega_metodo);
  if (!paso) return null;
  return (
    <Boton
      tam={compacto ? "sm" : "lg"}
      variante={compacto ? "claro" : "cartel"}
      cargando={pendiente}
      className={cn(!compacto && "w-full sm:w-auto")}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        empezar(async () => {
          const r = await actualizarPedido({ id: pedido.id, estado: paso.estado });
          if (r.ok) toast.success(`Pedido #${pedido.numero}: ${TEXTO_ESTADO[paso.estado].toLowerCase()}`);
          else toast.error(r.error);
        });
      }}
    >
      {!compacto && <CheckCircle2 className="size-5" />}
      {paso.texto}
    </Boton>
  );
}

export function AccionesPedido({ pedido, direccion }: { pedido: Pedido; direccion: string }) {
  const confirmar = useConfirmar();
  const [pendiente, empezar] = useTransition();
  const cancelado = pedido.estado === "cancelado";
  const puedeCobrar = !cancelado && pedido.estado_pago !== "aprobado";

  function marcarPagado() {
    empezar(async () => {
      const ok = await confirmar({
        titulo: `¿Marcar el pedido #${pedido.numero} como pagado?`,
        descripcion:
          pedido.metodo_pago === "mercadopago"
            ? "Mercado Pago avisa solo cuando el pago se acredita. Marcalo a mano únicamente si ya lo verificaste en tu cuenta."
            : "Confirmá que ya recibiste el dinero (transferencia acreditada o efectivo en mano). Si el pedido estaba pendiente, pasa a confirmado.",
        confirmar: "Sí, está pagado",
      });
      if (!ok) return;
      const r = await actualizarPedido({ id: pedido.id, estado_pago: "aprobado" });
      if (r.ok) toast.success("Pago registrado");
      else toast.error(r.error);
    });
  }

  function cancelar() {
    empezar(async () => {
      const ok = await confirmar({
        titulo: `¿Cancelar el pedido #${pedido.numero}?`,
        descripcion:
          "El stock reservado vuelve al catálogo y el pedido sale de las ventas. Si el cliente ya pagó, acordate de devolverle el dinero desde Mercado Pago o por transferencia.",
        confirmar: "Cancelar pedido",
        peligro: true,
      });
      if (!ok) return;
      const r = await actualizarPedido({ id: pedido.id, estado: "cancelado" });
      if (r.ok) toast.success(`Pedido #${pedido.numero} cancelado`);
      else toast.error(r.error);
    });
  }

  const wa = pedido.cliente_telefono
    ? linkWhatsApp(pedido.cliente_telefono, mensajeWhatsApp({ ...pedido, direccion }))
    : null;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <BotonSiguiente pedido={pedido} />
      {puedeCobrar && (
        <Boton variante="claro" tam="lg" onClick={marcarPagado} disabled={pendiente}>
          <Wallet className="size-5 text-verde" /> Marcar pagado
        </Boton>
      )}
      {wa && (
        <Boton asChild variante="claro" tam="lg">
          <a href={wa} target="_blank" rel="noreferrer">
            <MessageCircle className="size-5 text-verde" /> WhatsApp
          </a>
        </Boton>
      )}
      <Boton asChild variante="claro" tam="lg">
        <Link href={`/panel/remito/${pedido.numero}`} target="_blank">
          <Printer className="size-5" /> Remito
        </Link>
      </Boton>
      {!cancelado && pedido.estado !== "entregado" && (
        <Boton variante="fantasma" tam="lg" onClick={cancelar} disabled={pendiente} className="text-rojo hover:bg-[#fbe5e5] hover:text-rojo">
          <Ban className="size-5" /> Cancelar
        </Boton>
      )}
    </div>
  );
}

export function FormNota({ id }: { id: string }) {
  const [nota, setNota] = useState("");
  const [pendiente, empezar] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!nota.trim()) return;
        empezar(async () => {
          const r = await actualizarPedido({ id, nota });
          if (r.ok) {
            setNota("");
            toast.success("Nota guardada");
          } else toast.error(r.error);
        });
      }}
      className="flex gap-2"
    >
      <label htmlFor="nota-interna" className="sr-only">
        Nota interna
      </label>
      <input
        id="nota-interna"
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        placeholder="Agregar nota interna (no la ve el cliente)…"
        className="campo h-11 flex-1"
        maxLength={1000}
      />
      <Boton type="submit" variante="claro" cargando={pendiente} disabled={!nota.trim()}>
        Guardar
      </Boton>
    </form>
  );
}
