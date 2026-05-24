import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { getSupabaseUrl } from './url';

/**
 * Cliente estándar con anon key.
 * Respeta RLS. Usar en Route Handlers de usuario.
 *
 * TODO (auth): cuando se implemente Supabase Auth, reemplazar por
 * @supabase/ssr createServerClient con el cookie handler para Next.js,
 * de forma que la sesión del usuario se propague server-side.
 */
export function createServerClient() {
  return createClient<Database>(
    getSupabaseUrl(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * Cliente con service role key — omite RLS.
 * Usar SOLO en Route Handlers/Server Actions, nunca exponer al cliente.
 */
export function createAdminClient() {
  return createClient<Database>(
    getSupabaseUrl(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
