import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Middleware de Next.js — protección de rutas y refresco de sesión.
 *
 * Rutas protegidas:
 *   /nutriologo/*  → requiere sesión con tipo_usuario === 'nutriologo'
 *   /paciente/*    → requiere sesión con tipo_usuario === 'paciente'
 *
 * Si no hay sesión → redirige a /auth/login
 * Si el tipo no coincide → redirige a /auth/login
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Crear respuesta base (se renueva si necesitamos setear cookies) ──────────
  let supabaseResponse = NextResponse.next({ request });

  // ── Cliente Supabase para middleware ─────────────────────────────────────────
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          // Propagar las cookies al request y a la response
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // ── IMPORTANTE: llamar getUser() para refrescar tokens expirados ─────────────
  const { data: { user } } = await supabase.auth.getUser();

  // ── Rutas de auth — si ya hay sesión, redirigir al dashboard correcto ─────────
  if (pathname.startsWith('/auth/') && user) {
    const tipo = user.user_metadata?.tipo_usuario as string | undefined;
    const dest = tipo === 'paciente' ? '/paciente/inicio' : '/nutriologo/dashboard';
    return NextResponse.redirect(new URL(dest, request.url));
  }

  // ── Rutas protegidas ─────────────────────────────────────────────────────────
  const esNutriologo = pathname.startsWith('/nutriologo');
  const esPaciente   = pathname.startsWith('/paciente');

  if (esNutriologo || esPaciente) {
    // Sin sesión → login
    if (!user) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const tipo = user.user_metadata?.tipo_usuario as string | undefined;

    // Tipo incorrecto → login (evitar que un nutriólogo acceda a /paciente y viceversa)
    if (esNutriologo && tipo !== 'nutriologo') {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
    if (esPaciente && tipo !== 'paciente') {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
  }

  // ── Raíz "/" — redirigir según sesión ────────────────────────────────────────
  if (pathname === '/') {
    if (user) {
      const tipo = user.user_metadata?.tipo_usuario as string | undefined;
      const dest = tipo === 'paciente' ? '/paciente/inicio' : '/nutriologo/dashboard';
      return NextResponse.redirect(new URL(dest, request.url));
    }
    // Sin sesión → dejar pasar (la root page muestra landing)
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Ejecutar en todas las rutas EXCEPTO:
     *   - _next/static  (archivos estáticos)
     *   - _next/image   (optimización de imágenes)
     *   - favicon.ico   (favicon)
     *   - icons/        (PWA icons)
     *   - manifest.json (PWA manifest)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|icons|manifest\\.json).*)',
  ],
};
