import { Suspense } from "react";
import { BarraInferior, BarraInferiorConRuta } from "@/components/tienda/BarraInferior";
import { BotonWhatsApp } from "@/components/tienda/BotonWhatsApp";
import { Buscador } from "@/components/tienda/Buscador";
import { Cabecera, CabeceraConRuta } from "@/components/tienda/Cabecera";
import { ProveedorTienda, type DatosTienda } from "@/components/tienda/ContextoTienda";
import { PanelPedido } from "@/components/tienda/PanelPedido";
import { Pie } from "@/components/tienda/Pie";
import { VigiaMinimo } from "@/components/tienda/VigiaMinimo";
import { obtenerCategorias, obtenerConfig, obtenerSugeridos } from "@/lib/datos/catalogo";

export default async function LayoutTienda({ children }: { children: React.ReactNode }) {
  const [config, categorias, sugeridos] = await Promise.all([obtenerConfig(), obtenerCategorias(), obtenerSugeridos()]);

  const datos: DatosTienda = {
    nombre_tienda: config.nombre_tienda,
    compra_minima: config.compra_minima,
    whatsapp: config.whatsapp,
    direccion: config.direccion,
    ciudad: config.ciudad,
    instagram: config.instagram,
    horarios: config.horarios,
    envios: config.envios,
    pago_mercadopago: config.pago_mercadopago,
    pago_transferencia: config.pago_transferencia,
    pago_efectivo: config.pago_efectivo,
    descuento_transferencia: config.descuento_transferencia,
    mp_conectado: config.mp_conectado,
    mapa_url: config.mapa_url,
    categorias: categorias.map(({ id, slug, nombre, icono, color, cantidad }) => ({ id, slug, nombre, icono, color, cantidad })),
  };

  return (
    <ProveedorTienda datos={datos}>
      <Suspense fallback={<Cabecera />}>
        <CabeceraConRuta />
      </Suspense>
      <main id="contenido" className="min-h-[60vh]">
        {children}
      </main>
      <Pie config={config} />
      <Suspense fallback={<BarraInferior />}>
        <BarraInferiorConRuta />
      </Suspense>
      <PanelPedido sugeridos={sugeridos} />
      <Buscador />
      <VigiaMinimo />
      <Suspense fallback={null}>
        <BotonWhatsApp />
      </Suspense>
    </ProveedorTienda>
  );
}
