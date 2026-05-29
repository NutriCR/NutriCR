import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireNutriologo } from '@/lib/supabase/auth-helpers';

// ─── GET /api/pacientes/[id]/diario ──────────────────────────────────────────
// Devuelve todas las fotos del diario de un paciente para el nutricionista.

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireNutriologo();
  if (!auth.ok) return auth.response;

  const admin = createAdminClient();

  // Verificar que el paciente pertenece a este nutricionista
  const { data: paciente } = await admin
    .from('pacientes')
    .select('id')
    .eq('id', params.id)
    .eq('nutriologo_id', auth.data.nutriologoId)
    .maybeSingle();

  if (!paciente) {
    return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });
  }

  const { data, error } = await admin
    .from('diario_comidas')
    .select('id, foto_url, descripcion, revisada, created_at')
    .eq('paciente_id', params.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const sinRevisar = (data ?? []).filter((f) => !f.revisada).length;
  return NextResponse.json({ data: data ?? [], sinRevisar });
}

// ─── PATCH /api/pacientes/[id]/diario ────────────────────────────────────────
// Marca todas las fotos del paciente como revisadas.

export async function PATCH(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireNutriologo();
  if (!auth.ok) return auth.response;

  const { error } = await createAdminClient()
    .from('diario_comidas')
    .update({ revisada: true })
    .eq('paciente_id', params.id)
    .eq('revisada', false);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
