import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// ── GET /api/pacientes/[id]/mediciones ────────────────────────────────────────
// Lista todas las mediciones InBody del paciente, ordenadas por fecha ASC.

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('mediciones_inbody')
    .select('*')
    .eq('paciente_id', params.id)
    .order('fecha', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

// ── POST /api/pacientes/[id]/mediciones ───────────────────────────────────────
// Inserta una nueva medición InBody.

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createAdminClient();
  const body = await request.json() as {
    fecha:            string;
    peso?:            number | null;
    grasa_porcentaje?: number | null;
    musculo_kg?:      number | null;
    agua_porcentaje?: number | null;
  };

  if (!body.fecha) {
    return NextResponse.json({ error: 'fecha es requerida' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('mediciones_inbody')
    .insert({
      paciente_id:      params.id,
      fecha:            body.fecha,
      peso:             body.peso            ?? null,
      grasa_porcentaje: body.grasa_porcentaje ?? null,
      musculo_kg:       body.musculo_kg       ?? null,
      agua_porcentaje:  body.agua_porcentaje  ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
