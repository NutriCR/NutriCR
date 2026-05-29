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
// Campos opcionales: masa_osea (kg), grasa_visceral (entero 1-20).

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createAdminClient();
  const body = await request.json() as {
    fecha:              string;
    peso?:              number | null;
    grasa_porcentaje?:  number | null;
    musculo_kg?:        number | null;
    agua_porcentaje?:   number | null;
    masa_osea?:         number | null;
    grasa_visceral?:    number | null;
  };

  if (!body.fecha) {
    return NextResponse.json({ error: 'fecha es requerida' }, { status: 400 });
  }

  // Validar grasa_visceral: 1-20 si viene
  if (body.grasa_visceral != null) {
    const gv = Math.round(body.grasa_visceral);
    if (gv < 1 || gv > 20) {
      return NextResponse.json({ error: 'grasa_visceral debe estar entre 1 y 20' }, { status: 400 });
    }
    body.grasa_visceral = gv;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('mediciones_inbody')
    .insert({
      paciente_id:      params.id,
      fecha:            body.fecha,
      peso:             body.peso            ?? null,
      grasa_porcentaje: body.grasa_porcentaje ?? null,
      musculo_kg:       body.musculo_kg       ?? null,
      agua_porcentaje:  body.agua_porcentaje  ?? null,
      masa_osea:        body.masa_osea        ?? null,
      grasa_visceral:   body.grasa_visceral   ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
