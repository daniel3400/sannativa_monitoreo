// middleware.js
import { NextResponse } from "next/server";
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(req) {
  console.log("Middleware en ejecución para:", req.nextUrl.pathname);

  // Crear cliente de Supabase
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Verificar sesión
  const { data: { session } } = await supabase.auth.getSession();

  // Si no hay sesión y la ruta no es la página principal
  if (!session && req.nextUrl.pathname !== '/') {
    console.log("No hay sesión, redirigiendo a página principal");
    const redirectUrl = new URL('/', req.url);
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

// Configurar el matcher para excluir archivos estáticos y API
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
