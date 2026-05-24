import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

const TEST_NUTRIOLOGO_ID = '22222222-2222-2222-2222-222222222222';

// ── GET /api/pacientes/[id] ────────────────────────────────────────────────────
// Devuelve: paciente (con datos de usuario), plan activo y adherencia semanal.

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createAdminClient();
  const { id } = params;

  // Paciente + usuario vinculado
  const { data: paciente, error: pErr } = await supabase
    .from('pacientes')
    .select('*, usuarios(nombre, apellido, email)')
    .eq('id', id)
    .single();

  if (pErr || !paciente) {
    return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });
  }

  // Plan activo
  const { data: plan } = await supabase
    .from('planes_nutricionales')
    .select('*')
    .eq('paciente_id', id)
    .eq('activo', true)
    .maybeSingle();

  // Adherencia: recetas generadas en los últimos 7 días
  const hace7 = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { count } = await supabase
    .from('recetas_generadas')
    .select('id', { count: 'exact', head: true })
    .eq('paciente_id', id)
    .gte('created_at', hace7);

  const adherencia = Math.min(100, Math.round(((count ?? 0) / 7) * 100));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const usuario = (paciente as any).usuarios as {
    nombre: string;
    apellido: string | null;
    email: string;
  } | null;

  return NextResponse.json({
    paciente: {
      id:                  paciente.id,
      nombre:              usuario?.nombre              ?? '',
      apellido:            usuario?.apellido            ?? null,
      email:               usuario?.email               ?? '',
      objetivo:            paciente.objetivo,
      condiciones_medicas: paciente.condiciones_medicas ?? [],
      peso:                paciente.peso,
      altura:              paciente.altura,
      fecha_nacimiento:    paciente.fecha_nacimiento,
    },
    plan: plan ?? null,
    adherencia,
  });
}

// ── PATCH /api/pacientes/[id] ──────────────────────────────────────────────────
// Actualiza: objetivo y/o condiciones_medicas del paciente.

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createAdminClient();
  const body = await request.json() as {
    objetivo?: string | null;
    condiciones_medicas?: string[];
  };

  // Seguridad: solo actualizar pacientes vinculados a este nutriólogo
  const { error } = await supabase
    .from('pacientes')
    .update({
      ...(body.objetivo !== undefined            && { objetivo:            body.objetivo }),
      ...(body.condiciones_medicas !== undefined && { condiciones_medicas: body.condiciones_medicas }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .eq('nutriologo_id', TEST_NUTRIOLOGO_ID); // guard

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
