import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';
import { getSupabaseUrl, getAnonKey } from './url';

/**
 * Cliente Supabase para el navegador (componentes 'use client').
 * Usa anon key + sesión de cookies — NO tiene privilegios de service role.
 */
export function createClient() {
  return createBrowserClient<Database>(
    getSupabaseUrl(),
    getAnonKey(),
  );
}
