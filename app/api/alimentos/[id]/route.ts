import { NextResponse }    from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireNutriologo } from '@/lib/supabase/auth-helpers';

// ─── PATCH /api/alimentos/[id] ────────────────────────────────────────────────
// Edita los valores nutricionales de un alimento y/o lo valida.

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireNutriologo();
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const body = await request.json() as {
      nombre?:        string;
      calorias_100g?: number;
      proteina_100g?: number;
      carbos_100g?:   number;
      grasas_100g?:   number;
      fibra_100g?:    number | null;
      validado?:      boolean;
    };

    // Construir el objeto de update solo con los campos enviados
    const update: Record<string, unknown> = {};
    if (body.nombre        !== undefined) update.nombre        = body.nombre.trim();
    if (body.calorias_100g !== undefined) update.calorias_100g = Number(body.calorias_100g);
    if (body.proteina_100g !== undefined) update.proteina_100g = Number(body.proteina_100g);
    if (body.carbos_100g   !== undefined) update.carbos_100g   = Number(body.carbos_100g);
    if (body.grasas_100g   !== undefined) update.grasas_100g   = Number(body.grasas_100g);
    if (body.fibra_100g    !== undefined) update.fibra_100g    = body.fibra_100g != null ? Number(body.fibra_100g) : null;
    if (body.validado      !== undefined) update.validado      = body.validado;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 });
    }

    const { data, error } = await createAdminClient()
      .from('alimentos')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(update as any)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('[alimentos] PATCH error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('[alimentos] PATCH catch:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
