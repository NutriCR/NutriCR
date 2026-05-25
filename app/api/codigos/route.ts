import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireNutriologo } from '@/lib/supabase/auth-helpers';

// ── POST /api/codigos ──────────────────────────────────────────────────────────
// Guarda un código de invitación generado por el nutriólogo autenticado.

export async function POST(request: Request) {
  const auth = await requireNutriologo();
  if (!auth.ok) return auth.response;

  const { codigo } = await request.json() as { codigo: string };

  if (!codigo || codigo.length !== 9) {
    return NextResponse.json({ error: 'Formato de código inválido' }, { status: 400 });
  }

  const { error } = await createAdminClient()
    .from('codigos_invitacion')
    .insert({
      nutriologo_id: auth.data.nutriologoId,
      codigo,
    });

  if (error) {
    // Código duplicado (ya existe) → devolver ok igualmente
    if (error.code === '23505') return NextResponse.json({ ok: true });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

// ── GET /api/codigos?codigo=XXXX-XXXX ─────────────────────────────────────────
// Valida si un código existe y no ha sido usado. Sin auth requerida (para el
// formulario de registro del paciente antes de crear la cuenta).

export async function GET(request: Request) {
  const codigo = new URL(request.url).searchParams.get('codigo');

  if (!codigo) {
    return NextResponse.json({ error: 'Parámetro "codigo" requerido' }, { status: 400 });
  }

  const { data, error } = await createAdminClient()
    .from('codigos_invitacion')
    .select('usado')
    .eq('codigo', codigo.toUpperCase())
    .single();

  if (error || !data) {
    return NextResponse.json({ valido: false, error: 'Código no encontrado' });
  }
  if (data.usado) {
    return NextResponse.json({ valido: false, error: 'Código ya utilizado' });
  }

  return NextResponse.json({ valido: true });
}
