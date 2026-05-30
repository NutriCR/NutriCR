import { NextRequest, NextResponse } from 'next/server';
import { requireNutriologo }         from '@/lib/supabase/auth-helpers';
import { buscarEnOFF }               from '@/lib/alimentos';

// ─── GET /api/alimentos/buscar-off?q= ────────────────────────────────────────
// Busca en OpenFoodFacts por nombre y retorna los datos nutricionales.
// NO guarda en DB — solo para pre-llenar el formulario del nutricionista.

export async function GET(request: NextRequest) {
  try {
    const auth = await requireNutriologo();
    if (!auth.ok) return auth.response;

    const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
    if (q.length < 2) {
      return NextResponse.json({ data: null });
    }

    const datos = await buscarEnOFF(q).catch(() => null);
    return NextResponse.json({ data: datos ?? null });
  } catch (err) {
    console.error('[buscar-off] catch:', err);
    return NextResponse.json({ data: null });
  }
}
