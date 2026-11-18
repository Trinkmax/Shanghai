import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Isotipo } from "@/components/marca/Isotipo";
import { Seguimiento } from "@/components/tienda/pedido/Seguimiento";
import { Contenedor } from "@/components/tienda/TituloSeccion";
import { obtenerConfig } from "@/lib/datos/catalogo";
import { obtenerPedidoPublico } from "@/lib/datos/pedidos";

export const metadata: Metadata = { title: "Tu pedido", robots: { index: false, follow: false } };

type Params = Promise<{ token: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

function Esqueleto() {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="space-y-4">
        <div className="esqueleto h-72 w-full rounded-[1.5rem]" />
        <div className="esqueleto h-40 w-full rounded-[1.25rem]" />
      </div>
      <div className="esqueleto h-96 w-full rounded-[1.25rem]" />
    </div>
  );
}

async function Contenido({ params, searchParams }: { params: Params; searchParams: SP }) {
  const [{ token }, sp] = await Promise.all([params, searchParams]);
  const [pedido, config] = await Promise.all([obtenerPedidoPublico(token).catch(() => null), obtenerConfig()]);
  if (!pedido) {
    return (
      <div className="vidriera mx-auto flex max-w-xl flex-col items-center px-6 py-16 text-center">
        <Isotipo className="size-16 text-aluminio" grosor={6} />
        <h1 className="mt-5 text-xl font-bold text-tinta">No encontramos ese pedido</h1>
        <p className="mt-2 text-tinta-2">Revisá que el link esté completo o mirá tus pedidos guardados en este dispositivo.</p>
        <Link href="/mis-pedidos" className="mt-6 font-semibold text-marca-700 underline">
          Ver mis pedidos
        </Link>
      </div>
    );
  }
  const pago = typeof sp.pago === "string" ? sp.pago : null;
  return (
    <Seguimiento
      token={token}
      inicial={pedido}
      transferencia={config.transferencia_datos}
      nuevo={sp.nuevo === "1"}
      resultadoPago={pago === "ok" || pago === "pendiente" || pago === "error" ? pago : null}
    />
  );
}

export default function PaginaPedido({ params, searchParams }: { params: Params; searchParams: SP }) {
  return (
    <Contenedor className="pt-4 sm:pt-6">
      <Suspense fallback={<Esqueleto />}>
        <Contenido params={params} searchParams={searchParams} />
      </Suspense>
    </Contenedor>
  );
}
