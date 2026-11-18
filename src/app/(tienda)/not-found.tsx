import Link from "next/link";
import { Isotipo } from "@/components/marca/Isotipo";
import { Contenedor } from "@/components/tienda/TituloSeccion";

export default function NoEncontrado() {
  return (
    <Contenedor className="pt-8">
      <div className="vidriera flex flex-col items-center px-6 py-20 text-center">
        <Isotipo className="size-20 text-aluminio" grosor={6} />
        <h1 className="rotulo mt-6 text-[clamp(1.8rem,5vw,3rem)] text-marca-700">No está en la vidriera</h1>
        <p className="mt-3 max-w-[44ch] text-tinta-2">Puede que el producto ya no esté disponible o que el link esté incompleto. Buscalo por nombre o código.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <Link href="/catalogo" className="cartel presionable inline-flex h-12 items-center rounded-xl px-5 font-semibold">
            Ver el catálogo
          </Link>
          <Link href="/" className="presionable inline-flex h-12 items-center rounded-xl border border-aluminio-2 bg-white px-5 font-semibold text-tinta">
            Ir al inicio
          </Link>
        </div>
      </div>
    </Contenedor>
  );
}
