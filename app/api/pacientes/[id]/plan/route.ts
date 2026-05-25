import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireNutriologo } from '@/lib/supabase/auth-helpers';

// ── PATCH /api/pacientes/[id]/plan ────────────────────────────────────────────

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireNutriologo();
  if (!auth.ok) return auth.response;

  const supabase = createAdminClient();
  const body = await request.json() as {
    calorias_diarias?:         number | null;
    proteinas_g?:              number | null;
    carbohidratos_g?:          number | null;
    grasas_g?:                 number | null;
    restricciones_dieteticas?: string[];
  };

  const { data: existing } = await supabase
    .from('planes_nutricionales')
    .select('id')
    .eq('paciente_id', params.id)
    .eq('activo', true)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('planes_nutricionales')
      .update({
        calorias_diarias:         body.calorias_diarias         ?? null,
        proteinas_g:              body.proteinas_g              ?? null,
        carbohidratos_g:          body.carbohidratos_g          ?? null,
        grasas_g:                 body.grasas_g                 ?? null,
        restricciones_dieteticas: body.restricciones_dieteticas ?? [],
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabase
      .from('planes_nutricionales')
      .insert({
        paciente_id:              params.id,
        nutriologo_id:            auth.data.nutriologoId,
        nombre:                   'Plan principal',
        calorias_diarias:         body.calorias_diarias         ?? null,
        proteinas_g:              body.proteinas_g              ?? null,
        carbohidratos_g:          body.carbohidratos_g          ?? null,
        grasas_g:                 body.grasas_g                 ?? null,
        restricciones_dieteticas: body.restricciones_dieteticas ?? [],
        activo:                   true,
      });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
