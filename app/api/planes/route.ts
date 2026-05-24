import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = createServerClient();
  const { searchParams } = new URL(request.url);
  const pacienteId = searchParams.get('paciente_id');

  let query = supabase
    .from('planes_nutricionales')
    .select('*, pacientes(usuarios(nombre, apellido))');

  if (pacienteId) query = query.eq('paciente_id', pacienteId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const supabase = createServerClient();
  const body = await request.json();

  const { data, error } = await supabase.from('planes_nutricionales').insert(body).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
