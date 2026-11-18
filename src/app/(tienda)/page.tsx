import { FilaVidriera, GrillaVidriera } from "@/components/tienda/GrillaVidriera";
import { Ranking } from "@/components/tienda/portada/Ranking";
import { ComoComprar, ElLocal, GrillaRubros, Puerta } from "@/components/tienda/portada/Secciones";
import { Temporada } from "@/components/tienda/portada/Temporada";
import { Vidriera } from "@/components/tienda/portada/Vidriera";
import { Contenedor, TituloSeccion } from "@/components/tienda/TituloSeccion";
import {
  listarProductos,
  obtenerBanners,
  obtenerCategorias,
  obtenerConfig,
  obtenerDestacados,
  obtenerMasVendidos,
  obtenerNovedades,
  obtenerOfertas,
} from "@/lib/datos/catalogo";
import type { Categoria, ProductoVista } from "@/lib/tienda";

async function fotosDeBanner(href: string | null, categorias: Categoria[], respaldo: ProductoVista[]) {
  let lista: ProductoVista[] = respaldo;
  if (href?.startsWith("/rubro/")) {
    const c = categorias.find((x) => x.slug === href.split("/")[2]);
    if (c) lista = await listarProductos({ rubro: c.id, orden: "relevancia" });
  } else if (href === "/novedades") lista = await obtenerNovedades(6);
  else if (href === "/ofertas") lista = await obtenerOfertas();
  return lista
    .filter((p) => p.imagenes[0] && !p.agotado)
    .slice(0, 3)
    .map((p) => p.imagenes[0]);
}

export default async function Inicio() {
  const [config, categorias, destacados, ofertas, vendidos, novedades, banners] = await Promise.all([
    obtenerConfig(),
    obtenerCategorias(),
    obtenerDestacados(),
    obtenerOfertas(),
    obtenerMasVendidos(10),
    obtenerNovedades(10),
    obtenerBanners(),
  ]);
  const exhibidor = destacados.length >= 6 ? destacados : [...destacados, ...novedades].slice(0, 6);
  const carteles = await Promise.all(
    banners.map(async (b) => ({ ...b, fotos: await fotosDeBanner(b.cta_href, categorias, destacados) })),
  );

  return (
    <>
      <Vidriera config={config} categorias={categorias} destacados={exhibidor} />
      <Puerta config={config} />

      {ofertas.length > 0 && (
        <section aria-labelledby="titulo-ofertas" className="mt-14 px-2 sm:mt-20 sm:px-3">
          <div className="mx-auto max-w-[1440px] rounded-[1.75rem] bg-[linear-gradient(170deg,#ffd03d_0%,#ffc21a_40%,#f7b500_100%)] px-3 pb-3 pt-7 shadow-[0_24px_60px_-30px_rgb(242_174_0/0.9)] sm:px-5 sm:pb-5 sm:pt-10 lg:px-6">
            <TituloSeccion
              id="titulo-ofertas"
              tono="ambar"
              titulo="Ofertas"
              bajada="Precios ya rebajados, mientras dure el stock."
              href="/ofertas"
              accion={`Ver las ${ofertas.length}`}
              className="px-1"
            />
            <FilaVidriera
              productos={(ofertas.filter((p) => p.imagenes.length).length >= 6 ? ofertas.filter((p) => p.imagenes.length) : ofertas).slice(0, 12)}
              className="border-ambar-2/40"
            />
          </div>
        </section>
      )}

      <GrillaRubros categorias={categorias} />
      <Ranking productos={vendidos} />
      <Temporada banners={carteles} />

      {novedades.length > 0 && (
        <Contenedor className="mt-16 sm:mt-24">
          <TituloSeccion
            titulo="Recién llegados"
            bajada="Lo último que entró al local, ya con precio mayorista."
            href="/novedades"
            accion="Ver todas"
            id="titulo-novedades"
          />
          <GrillaVidriera productos={novedades} columnas="grid-cols-2 md:grid-cols-3 lg:grid-cols-5" />
        </Contenedor>
      )}

      <ComoComprar config={config} />
      <ElLocal config={config} />
    </>
  );
}
