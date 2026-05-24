import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

const TEST_NUTRIOLOGO_ID = '22222222-2222-2222-2222-222222222222';

// ── PATCH /api/pacientes/[id]/plan ────────────────────────────────────────────
// Actualiza el plan activo del paciente. Si no existe, crea uno nuevo.

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createAdminClient();
  const body = await request.json() as {
    calorias_diarias?:        number | null;
    proteinas_g?:             number | null;
    carbohidratos_g?:         number | null;
    grasas_g?:                number | null;
    restricciones_dieteticas?: string[];
  };

  // ¿Existe ya un plan activo?
  const { data: existing } = await supabase
    .from('planes_nutricionales')
    .select('id')
    .eq('paciente_id', params.id)
    .eq('activo', true)
    .maybeSingle();

  if (existing) {
    // Actualizar plan existente
    const { error } = await supabase
      .from('planes_nutricionales')
      .update({
        calorias_diarias:        body.calorias_diarias        ?? null,
        proteinas_g:             body.proteinas_g             ?? null,
        carbohidratos_g:         body.carbohidratos_g         ?? null,
        grasas_g:                body.grasas_g                ?? null,
        restricciones_dieteticas: body.restricciones_dieteticas ?? [],
        updated_at:              new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    // Crear plan nuevo
    const { error } = await supabase
      .from('planes_nutricionales')
      .insert({
        paciente_id:             params.id,
        nutriologo_id:           TEST_NUTRIOLOGO_ID,
        nombre:                  'Plan principal',
        calorias_diarias:        body.calorias_diarias        ?? null,
        proteinas_g:             body.proteinas_g             ?? null,
        carbohidratos_g:         body.carbohidratos_g         ?? null,
        grasas_g:                body.grasas_g                ?? null,
        restricciones_dieteticas: body.restricciones_dieteticas ?? [],
        activo:                  true,
      });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
