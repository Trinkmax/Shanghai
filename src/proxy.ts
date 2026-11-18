import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresca la sesión de Supabase y protege el panel.
 * La tienda es pública: el proxy solo corre en /panel (ver `matcher`).
 */
const RUTAS_PUBLICAS_PANEL = ["/panel/ingresar", "/panel/inicio"];

export async function proxy(request: NextRequest) {
  let respuesta = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          respuesta = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => respuesta.cookies.set(name, value, options));
        },
      },
    },
  );

  // No ejecutar código entre createServerClient y getClaims: mantiene la sesión fresca.
  const { data } = await supabase.auth.getClaims();
  const hayUsuario = Boolean(data?.claims?.sub);
  const { pathname } = request.nextUrl;
  const esPublica = RUTAS_PUBLICAS_PANEL.some((r) => pathname.startsWith(r));

  if (!hayUsuario && !esPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/panel/ingresar";
    url.search = "";
    if (pathname !== "/panel") url.searchParams.set("volver", pathname);
    return NextResponse.redirect(url);
  }

  return respuesta;
}

export const config = {
  matcher: ["/panel/:path*"],
};
