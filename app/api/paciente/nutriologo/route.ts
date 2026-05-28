import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requirePaciente } from '@/lib/supabase/auth-helpers';

// ─── GET /api/paciente/nutriologo ─────────────────────────────────────────────
// Devuelve info del nutriólogo vinculado al paciente autenticado.
// Respuesta: { nutriologo: { nombre, apellido, codigoInvitacion } | null }

export async function GET() {
  const auth = await requirePaciente();
  if (!auth.ok) return auth.response;

  const admin = createAdminClient();

  // Leer nutriologo_id del paciente
  const { data: paciente } = await admin
    .from('pacientes')
    .select('nutriologo_id')
    .eq('id', auth.data.pacienteId)
    .maybeSingle();

  if (!paciente?.nutriologo_id) {
    return NextResponse.json({ nutriologo: null });
  }

  // Datos del nutriólogo
  const { data: nutriologo } = await admin
    .from('nutriologos')
    .select('id, codigo_invitacion, usuario_id')
    .eq('id', paciente.nutriologo_id)
    .maybeSingle();

  if (!nutriologo) {
    return NextResponse.json({ nutriologo: null });
  }

  // Nombre del nutriólogo (está en la tabla usuarios)
  const { data: usuario } = await admin
    .from('usuarios')
    .select('nombre, apellido')
    .eq('id', nutriologo.usuario_id)
    .maybeSingle();

  return NextResponse.json({
    nutriologo: {
      nombre:           usuario?.nombre   ?? 'Nutriólogo',
      apellido:         usuario?.apellido ?? null,
      codigoInvitacion: nutriologo.codigo_invitacion,
    },
  });
}

// ─── PATCH /api/paciente/nutriologo ──────────────────────────────────────────
// Vincula (o cambia) el nutriólogo del paciente autenticado usando un código.
// Desvincula al nutriólogo anterior automáticamente.
// Body: { codigo: "XXXX-XXXX" }

export async function PATCH(request: Request) {
  const auth = await requirePaciente();
  if (!auth.ok) return auth.response;

  let body: { codigo?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const codigo = body.codigo?.toUpperCase().trim() ?? '';

  if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(codigo)) {
    return NextResponse.json(
      { error: 'Formato de código inválido. Debe ser XXXX-XXXX.' },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // Buscar nutriólogo por código de invitación
  const { data: nutriologoRow, error: findErr } = await admin
    .from('nutriologos')
    .select('id, codigo_invitacion, usuario_id')
    .eq('codigo_invitacion', codigo)
    .maybeSingle();

  if (findErr || !nutriologoRow) {
    return NextResponse.json(
      { error: 'Código inválido. Verificá con tu nutriólogo.' },
      { status: 404 },
    );
  }

  // Actualizar nutriologo_id del paciente (desvincula al anterior automáticamente)
  const { error: updateErr } = await admin
    .from('pacientes')
    .update({ nutriologo_id: nutriologoRow.id })
    .eq('id', auth.data.pacienteId);

  if (updateErr) {
    console.error('[paciente/nutriologo] update error:', updateErr.message);
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Leer nombre del nutriólogo para devolver al cliente
  const { data: usuario } = await admin
    .from('usuarios')
    .select('nombre, apellido')
    .eq('id', nutriologoRow.usuario_id)
    .maybeSingle();

  return NextResponse.json({
    nutriologo: {
      nombre:           usuario?.nombre   ?? 'Nutriólogo',
      apellido:         usuario?.apellido ?? null,
      codigoInvitacion: nutriologoRow.codigo_invitacion,
    },
  });
}
