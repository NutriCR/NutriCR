import { createClient } from '@supabase/supabase-js';
import { createServerClient as createSSRServerClient, type SetAllCookies } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './database.types';
import { getSupabaseUrl } from './url';

/**
 * Cliente autenticado con anon key + cookies de sesión.
 * Usar en Route Handlers que necesitan conocer quién es el usuario.
 * Llama a supabase.auth.getUser() para obtener el usuario autenticado.
 */
export function createAuthClient() {
  const cookieStore = cookies();
  return createSSRServerClient<Database>(
    getSupabaseUrl(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Route Handlers de solo-lectura no pueden setear cookies — ignorar
          }
        },
      },
    },
  );
}

/**
 * Cliente estándar con anon key sin sesión.
 * Mantener para compatibilidad; preferir createAuthClient() cuando se requiera auth.
 */
export function createServerClient() {
  return createClient<Database>(
    getSupabaseUrl(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/**
 * Cliente con service role key — omite RLS.
 * Usar SOLO en Route Handlers/Server Actions. NUNCA exponer al cliente.
 */
export function createAdminClient() {
  return createClient<Database>(
    getSupabaseUrl(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
