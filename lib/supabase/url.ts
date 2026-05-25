/**
 * Helpers para leer y validar las variables de entorno de Supabase.
 *
 * getSupabaseUrl() — acepta tanto la URL base como la URL con path (/rest/v1/)
 *   que el dashboard de Supabase muestra en la sección API.
 *   Siempre devuelve solo el origin (protocol + host).
 *
 * getAnonKey() / getServiceRoleKey() — validan que la variable exista
 *   y lanzan un error descriptivo si no está configurada.
 */

// ─── URL ─────────────────────────────────────────────────────────────────────

export function getSupabaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!raw) {
    throw new Error(
      'Falta NEXT_PUBLIC_SUPABASE_URL. ' +
      'Encuéntrala en Supabase → Settings → API → Project URL. ' +
      'En Vercel: Settings → Environment Variables.',
    );
  }

  try {
    const { protocol, host } = new URL(raw);
    // Devolver solo el origin, descartando /rest/v1/ u otros paths
    return `${protocol}//${host}`;
  } catch {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL no es válida: "${raw}". ` +
      'Formato esperado: https://tu-proyecto.supabase.co',
    );
  }
}

// ─── Claves ───────────────────────────────────────────────────────────────────

export function getAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error(
      'Falta NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Encuéntrala en Supabase → Settings → API → Project API keys → anon public. ' +
      'En Vercel: Settings → Environment Variables.',
    );
  }
  return key;
}

export function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      'Falta SUPABASE_SERVICE_ROLE_KEY. ' +
      'Encuéntrala en Supabase → Settings → API → Project API keys → service_role. ' +
      'En Vercel: Settings → Environment Variables (no marcar "Expose to browser").',
    );
  }
  return key;
}
