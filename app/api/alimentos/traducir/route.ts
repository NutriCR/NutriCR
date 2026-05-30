import { NextResponse }           from 'next/server';
import { createAdminClient }       from '@/lib/supabase/server';
import { requireNutriologo }       from '@/lib/supabase/auth-helpers';
import { traducirNombreAlimento }  from '@/lib/alimentos';

// ─── GET /api/alimentos/traducir ──────────────────────────────────────────────
// Devuelve la cantidad de alimentos USDA que aún no tienen traducción
// (fuente = 'usda' AND nombre_original IS NULL).

export async function GET() {
  try {
    const auth = await requireNutriologo();
    if (!auth.ok) return auth.response;

    const { count, error } = await createAdminClient()
      .from('alimentos')
      .select('id', { count: 'exact', head: true })
      .eq('fuente', 'usda')
      .is('nombre_original', null);

    if (error) {
      console.error('[traducir] GET error:', error.message);
      return NextResponse.json({ pendientes: 0 });
    }

    return NextResponse.json({ pendientes: count ?? 0 });
  } catch (err) {
    console.error('[traducir] GET catch:', err);
    return NextResponse.json({ pendientes: 0 });
  }
}

// ─── POST /api/alimentos/traducir ─────────────────────────────────────────────
// Toma hasta `limite` alimentos USDA sin traducir, los traduce con Claude Haiku
// y actualiza nombre + nombre_original en la tabla.
//
// Body: { limite?: number }  — default 5
// Returns: { traducidos, pendientes }

export async function POST(request: Request) {
  try {
    const auth = await requireNutriologo();
    if (!auth.ok) return auth.response;

    const { limite = 5 } = await request.json().catch(() => ({})) as { limite?: number };
    const admin = createAdminClient();

    // Buscar alimentos USDA sin traducción
    const { data, error } = await admin
      .from('alimentos')
      .select('id, nombre')
      .eq('fuente', 'usda')
      .is('nombre_original', null)
      .limit(Math.min(limite, 10));   // máximo 10 por request para no agotar tokens

    if (error) {
      console.error('[traducir] POST select error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ traducidos: 0, pendientes: 0 });
    }

    // Traducir en paralelo con Claude Haiku
    const resultados = await Promise.allSettled(
      data.map(async (item) => {
        const nombreIngles  = item.nombre;
        const nombreEspanol = await traducirNombreAlimento(nombreIngles);

        const { error: updateErr } = await admin
          .from('alimentos')
          .update({
            nombre:          nombreEspanol,
            nombre_original: nombreIngles,
          })
          .eq('id', item.id);

        if (updateErr) {
          console.error(`[traducir] update falló para ${item.id}:`, updateErr.message);
          throw updateErr;
        }

        console.log(`[traducir] ✓ "${nombreIngles}" → "${nombreEspanol}"`);
        return { id: item.id, original: nombreIngles, traducido: nombreEspanol };
      }),
    );

    const traducidos = resultados.filter((r) => r.status === 'fulfilled').length;

    // Contar cuántos quedan pendientes
    const { count: pendientes } = await admin
      .from('alimentos')
      .select('id', { count: 'exact', head: true })
      .eq('fuente', 'usda')
      .is('nombre_original', null);

    return NextResponse.json({ traducidos, pendientes: pendientes ?? 0 });
  } catch (err) {
    console.error('[traducir] POST catch:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
