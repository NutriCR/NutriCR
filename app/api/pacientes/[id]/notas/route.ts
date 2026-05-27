import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireNutriologo } from '@/lib/supabase/auth-helpers';

// ── GET /api/pacientes/[id]/notas ──────────────────────────────────────────────

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireNutriologo();
  if (!auth.ok) return auth.response;

  const { data, error } = await createAdminClient()
    .from('notas')
    .select('*')
    .eq('paciente_id', params.id)
    .order('fecha', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

// ── POST /api/pacientes/[id]/notas ────────────────────────────────────────────

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireNutriologo();
  if (!auth.ok) return auth.response;

  const body = await request.json() as { mensaje: string };

  if (!body.mensaje?.trim()) {
    return NextResponse.json({ error: 'mensaje no puede estar vacío' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from('notas')
    .insert({
      paciente_id:   params.id,
      nutriologo_id: auth.data.nutriologoId,
      mensaje:       body.mensaje.trim(),
      fecha:         new Date().toISOString(),
      leida:         false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Crear notificación para el paciente (fallo silencioso — no bloquea la respuesta)
  await admin
    .from('notificaciones')
    .insert({
      paciente_id: params.id,
      tipo:        'nota',
      mensaje:     body.mensaje.trim(),
      leida:       false,
    })
    .then(({ error: notifErr }) => {
      if (notifErr) console.error('[notas] Error al crear notificación:', notifErr.message);
    });

  return NextResponse.json({ data }, { status: 201 });
}
