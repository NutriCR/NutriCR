import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

const TEST_NUTRIOLOGO_ID = '22222222-2222-2222-2222-222222222222';

// ── GET /api/pacientes/[id]/notas ──────────────────────────────────────────────
// Lista todas las notas del nutriólogo para este paciente, DESC por fecha.

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('notas')
    .select('*')
    .eq('paciente_id', params.id)
    .order('fecha', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

// ── POST /api/pacientes/[id]/notas ────────────────────────────────────────────
// Crea una nueva nota del nutriólogo para el paciente.

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createAdminClient();
  const body = await request.json() as { mensaje: string };

  if (!body.mensaje?.trim()) {
    return NextResponse.json({ error: 'mensaje no puede estar vacío' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('notas')
    .insert({
      paciente_id:   params.id,
      nutriologo_id: TEST_NUTRIOLOGO_ID,
      mensaje:       body.mensaje.trim(),
      fecha:         new Date().toISOString(),
      leida:         false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
