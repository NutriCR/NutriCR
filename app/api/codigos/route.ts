import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireNutriologo } from '@/lib/supabase/auth-helpers';

// ─── GET /api/codigos?codigo=XXXX-XXXX ────────────────────────────────────────
// Valida si un código existe en nutriologos.codigo_invitacion.
// Sin autenticación — se llama desde el formulario de registro del paciente.

export async function GET(request: Request) {
  const codigo = new URL(request.url).searchParams.get('codigo');

  if (!codigo) {
    return NextResponse.json({ error: 'Parámetro "codigo" requerido' }, { status: 400 });
  }

  const { data, error } = await createAdminClient()
    .from('nutriologos')
    .select('id')
    .eq('codigo_invitacion', codigo.toUpperCase())
    .maybeSingle();

  if (error) {
    return NextResponse.json({ valido: false, error: 'Error al validar código' });
  }

  if (!data) {
    return NextResponse.json({
      valido: false,
      error: 'Código inválido, verificá con tu nutriólogo',
    });
  }

  return NextResponse.json({ valido: true });
}

// ─── POST /api/codigos ────────────────────────────────────────────────────────
// Guarda (o reemplaza) el código de invitación del nutriólogo autenticado
// en la columna nutriologos.codigo_invitacion.
// Body: { codigo: "XXXX-XXXX" }

export async function POST(request: Request) {
  const auth = await requireNutriologo();
  if (!auth.ok) return auth.response;

  const body = await request.json() as { codigo?: string };
  const codigo = body.codigo?.toUpperCase().trim();

  if (!codigo || !/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(codigo)) {
    return NextResponse.json(
      { error: 'Formato de código inválido. Esperado: XXXX-XXXX' },
      { status: 400 },
    );
  }

  const { error } = await createAdminClient()
    .from('nutriologos')
    .update({ codigo_invitacion: codigo })
    .eq('id', auth.data.nutriologoId);

  if (error) {
    // 23505 = unique constraint — código ya en uso por otro nutriólogo
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Código ya registrado. Generá uno nuevo.' },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, codigo });
}
