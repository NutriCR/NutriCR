import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requirePaciente } from '@/lib/supabase/auth-helpers';

// ─── GET /api/notificaciones ──────────────────────────────────────────────────
// Devuelve las notificaciones del paciente autenticado (máx 30).

export async function GET() {
  const auth = await requirePaciente();
  if (!auth.ok) return auth.response;

  const { data, error } = await createAdminClient()
    .from('notificaciones')
    .select('id, tipo, mensaje, leida, created_at')
    .eq('paciente_id', auth.data.pacienteId)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const noLeidas = (data ?? []).filter((n) => !n.leida).length;
  return NextResponse.json({ data: data ?? [], noLeidas });
}

// ─── PATCH /api/notificaciones ────────────────────────────────────────────────
// Marca todas (o una) notificación como leída.
// Body: {} → marca todas. { id } → marca solo esa.

export async function PATCH(request: Request) {
  const auth = await requirePaciente();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({})) as { id?: string };
  const admin = createAdminClient();

  let query = admin
    .from('notificaciones')
    .update({ leida: true })
    .eq('paciente_id', auth.data.pacienteId)
    .eq('leida', false);

  if (body.id) query = query.eq('id', body.id) as typeof query;

  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
