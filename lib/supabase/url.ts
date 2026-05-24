/**
 * Extrae solo `protocol://host` de NEXT_PUBLIC_SUPABASE_URL.
 *
 * El dashboard de Supabase muestra en la sección API la URL completa con path
 * (ej. https://abc.supabase.co/rest/v1/). El SDK solo acepta la URL base.
 * Esta función acepta ambos formatos y siempre devuelve el correcto.
 *
 * ✅ https://abc.supabase.co           → https://abc.supabase.co
 * ✅ https://abc.supabase.co/rest/v1/  → https://abc.supabase.co
 * ✅ https://abc.supabase.co/rest/v1   → https://abc.supabase.co
 */
export function getSupabaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!raw) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL no está definida. ' +
      'Cópiala desde Supabase → Settings → API → Project URL.'
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL no es una URL válida: "${raw}". ` +
      'Formato esperado: https://tu-proyecto.supabase.co'
    );
  }

  // Devolver solo protocol + host, descartando cualquier path/query/hash
  return `${parsed.protocol}//${parsed.host}`;
}
