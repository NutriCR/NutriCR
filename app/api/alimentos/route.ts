import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient }         from '@/lib/supabase/server';
import { requireNutriologo }         from '@/lib/supabase/auth-helpers';

const LIMIT = 20;

// ─── GET /api/alimentos ───────────────────────────────────────────────────────
// Params: ?q=&fuente=&validado=&page=1
// Devuelve la lista paginada de alimentos para el catálogo del nutricionista.

export async function GET(request: NextRequest) {
  try {
    const auth = await requireNutriologo();
    if (!auth.ok) return auth.response;

    const sp      = request.nextUrl.searchParams;
    const q       = sp.get('q')?.trim()  ?? '';
    const fuente  = sp.get('fuente')     ?? '';
    const validado = sp.get('validado')  ?? '';   // 'true' | 'false' | ''
    const page    = Math.max(1, Number(sp.get('page') ?? '1'));
    const from    = (page - 1) * LIMIT;
    const to      = from + LIMIT - 1;

    let query = createAdminClient()
      .from('alimentos')
      .select('*', { count: 'exact' })
      .order('nombre', { ascending: true })
      .range(from, to);

    if (q)       query = query.ilike('nombre', `%${q}%`);
    if (fuente)  query = query.eq('fuente', fuente as 'openfoodfacts' | 'usda' | 'manual' | 'ia');
    if (validado === 'true')  query = query.eq('validado', true);
    if (validado === 'false') query = query.eq('validado', false);

    const { data, error, count } = await query;

    if (error) {
      console.error('[alimentos] GET error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data:   data ?? [],
      total:  count ?? 0,
      page,
      pages:  Math.ceil((count ?? 0) / LIMIT),
    });
  } catch (err) {
    console.error('[alimentos] GET catch:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// ─── POST /api/alimentos ──────────────────────────────────────────────────────
// Crea un alimento manualmente. Lo marca como validado=true por defecto.

export async function POST(request: Request) {
  try {
    const auth = await requireNutriologo();
    if (!auth.ok) return auth.response;

    const body = await request.json() as {
      nombre:        string;
      calorias_100g: number;
      proteina_100g: number;
      carbos_100g:   number;
      grasas_100g:   number;
      fibra_100g?:   number | null;
      fuente?:       string;
    };

    if (!body.nombre?.trim()) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }

    const { data, error } = await createAdminClient()
      .from('alimentos')
      .insert({
        nombre:        body.nombre.trim(),
        calorias_100g: Number(body.calorias_100g) || 0,
        proteina_100g: Number(body.proteina_100g) || 0,
        carbos_100g:   Number(body.carbos_100g)   || 0,
        grasas_100g:   Number(body.grasas_100g)   || 0,
        fibra_100g:    body.fibra_100g != null ? Number(body.fibra_100g) : null,
        fuente:        (body.fuente ?? 'manual') as 'openfoodfacts' | 'usda' | 'manual' | 'ia',
        validado:      true,
      })
      .select('*')
      .single();

    if (error) {
      console.error('[alimentos] POST error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error('[alimentos] POST catch:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
