import { NextResponse } from 'next/server';
import { createAuthClient, createAdminClient } from '@/lib/supabase/server';

/**
 * POST /api/auth/setup-profile
 *
 * Se llama inmediatamente después de supabase.auth.signUp() desde el cliente.
 * Lee la sesión desde las cookies para verificar que el usuario existe,
 * luego crea los registros en las tablas usuarios + nutriologos|pacientes.
 *
 * Body para nutriólogo:
 *   { tipo_usuario: 'nutriologo', nombre, apellido?, numero_colegiado? }
 *
 * Body para paciente:
 *   { tipo_usuario: 'paciente', nombre, apellido?, codigo_nutriologo }
 */
export async function POST(request: Request) {
  try {
    // ── 1. Verificar sesión ──────────────────────────────────────────────────
    const authClient = createAuthClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await request.json() as {
      tipo_usuario:     'nutriologo' | 'paciente';
      nombre:           string;
      apellido?:        string | null;
      numero_colegiado?: string | null;
      codigo_nutriologo?: string;
    };

    const admin = createAdminClient();

    // ── 2. Crear fila en usuarios (id = auth.users.id) ───────────────────────
    const { error: usrError } = await admin
      .from('usuarios')
      .upsert(
        {
          id:           user.id,          // ← clave: mismo UUID que auth.users.id
          email:        user.email!,
          nombre:       body.nombre,
          apellido:     body.apellido ?? null,
          tipo_usuario: body.tipo_usuario,
        },
        { onConflict: 'id' },
      );

    if (usrError) {
      console.error('[setup-profile] upsert usuarios:', usrError);
      return NextResponse.json({ error: usrError.message }, { status: 500 });
    }

    // ── 3. Crear fila específica según tipo ──────────────────────────────────

    if (body.tipo_usuario === 'nutriologo') {
      const { error: nutrError } = await admin
        .from('nutriologos')
        .insert({
          usuario_id:    user.id,
          numero_cedula: body.numero_colegiado ?? null,
        });

      if (nutrError && nutrError.code !== '23505') {
        // 23505 = unique violation → ya existía (idempotente)
        console.error('[setup-profile] insert nutriologos:', nutrError);
        return NextResponse.json({ error: nutrError.message }, { status: 500 });
      }

    } else {
      // ── Paciente: validar código de invitación ─────────────────────────────

      if (!body.codigo_nutriologo) {
        return NextResponse.json({ error: 'Código de nutriólogo requerido' }, { status: 400 });
      }

      const { data: codigoRow, error: codigoError } = await admin
        .from('codigos_invitacion')
        .select('id, nutriologo_id, usado')
        .eq('codigo', body.codigo_nutriologo)
        .single();

      if (codigoError || !codigoRow) {
        return NextResponse.json({ error: 'Código de invitación no encontrado' }, { status: 400 });
      }
      if (codigoRow.usado) {
        return NextResponse.json({ error: 'Código de invitación ya utilizado' }, { status: 400 });
      }

      // Crear paciente vinculado al nutriólogo
      const { error: pacError } = await admin
        .from('pacientes')
        .insert({
          usuario_id:    user.id,
          nutriologo_id: codigoRow.nutriologo_id,
        });

      if (pacError && pacError.code !== '23505') {
        console.error('[setup-profile] insert pacientes:', pacError);
        return NextResponse.json({ error: pacError.message }, { status: 500 });
      }

      // Marcar código como usado
      await admin
        .from('codigos_invitacion')
        .update({ usado: true, usado_at: new Date().toISOString() })
        .eq('id', codigoRow.id);
    }

    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error('[setup-profile] catch:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 },
    );
  }
}
