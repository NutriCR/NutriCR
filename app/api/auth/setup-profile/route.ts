import { NextResponse } from 'next/server';
import { createAuthClient, createAdminClient } from '@/lib/supabase/server';

const TAG = '[setup-profile]';

/**
 * POST /api/auth/setup-profile
 *
 * Se llama inmediatamente después de supabase.auth.signUp() desde el cliente.
 *
 * Autenticación — dos modos:
 *   A) Email confirmation OFF → signUp devuelve sesión → getUser() funciona normalmente.
 *   B) Email confirmation ON  → signUp devuelve user pero SIN sesión (session: null).
 *      En este caso el cliente pasa `user_id` en el body y lo verificamos vía admin API.
 *
 * Body para nutriólogo:
 *   { tipo_usuario: 'nutriologo', nombre, apellido?, numero_colegiado?, user_id? }
 *
 * Body para paciente:
 *   { tipo_usuario: 'paciente', nombre, apellido?, codigo_nutriologo, user_id? }
 */
export async function POST(request: Request) {
  try {

    // ── 0. Parsear body primero (el stream solo se puede leer una vez) ──────────
    let body: {
      tipo_usuario:       'nutriologo' | 'paciente';
      nombre:             string;
      apellido?:          string | null;
      numero_colegiado?:  string | null;
      codigo_nutriologo?: string;
      user_id?:           string;           // ← para el caso sin sesión
    };

    try {
      body = await request.json();
    } catch (parseErr) {
      console.error(`${TAG} error al parsear body:`, parseErr);
      return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
    }

    console.log(`${TAG} request recibida | tipo=${body.tipo_usuario} | user_id_body=${body.user_id ?? 'none'}`);

    // ── 1. Identificar al usuario ────────────────────────────────────────────────
    //   Modo A: sesión activa (email confirmation OFF)
    //   Modo B: sin sesión pero con user_id en body (email confirmation ON)

    let userId:    string;
    let userEmail: string;

    const authClient = createAuthClient();
    const { data: { user: sessionUser }, error: authError } = await authClient.auth.getUser();

    if (sessionUser) {
      // ── Modo A ──────────────────────────────────────────────────────────────
      console.log(`${TAG} Modo A — sesión activa | userId=${sessionUser.id} | email=${sessionUser.email}`);
      userId    = sessionUser.id;
      userEmail = sessionUser.email!;

    } else if (body.user_id) {
      // ── Modo B: email confirmation habilitado ────────────────────────────────
      console.log(`${TAG} Modo B — sin sesión, verificando user_id=${body.user_id} via admin`);
      console.log(`${TAG} authError del getUser:`, authError?.message ?? 'null');

      const admin = createAdminClient();
      const { data: authUserData, error: adminErr } = await admin.auth.admin.getUserById(body.user_id);

      if (adminErr || !authUserData.user) {
        console.error(`${TAG} usuario no encontrado en auth.users | adminErr:`, adminErr?.message ?? 'null');
        return NextResponse.json({ error: 'Usuario no encontrado en Auth' }, { status: 401 });
      }

      // Verificar que la cuenta fue creada hace menos de 10 minutos
      const ageMs = Date.now() - new Date(authUserData.user.created_at).getTime();
      console.log(`${TAG} cuenta creada hace ${Math.round(ageMs / 1000)}s`);

      if (ageMs > 10 * 60 * 1000) {
        console.error(`${TAG} user_id demasiado antiguo (${Math.round(ageMs / 60000)}min) — rechazado`);
        return NextResponse.json({ error: 'Sesión de registro expirada. Vuelve a intentarlo.' }, { status: 401 });
      }

      userId    = authUserData.user.id;
      userEmail = authUserData.user.email!;
      console.log(`${TAG} Modo B OK | userId=${userId} | email=${userEmail}`);

    } else {
      // Sin sesión y sin user_id → no se puede continuar
      console.error(`${TAG} sin sesión y sin user_id en body | authError:`, authError?.message ?? 'null');
      return NextResponse.json(
        { error: 'No autenticado. Si el correo requiere confirmación, asegúrate de pasar user_id.' },
        { status: 401 },
      );
    }

    const admin = createAdminClient();

    // ── 2. Upsert en usuarios (id = auth.users.id) ───────────────────────────────
    console.log(`${TAG} upsert en usuarios | id=${userId}`);
    const { error: usrError } = await admin
      .from('usuarios')
      .upsert(
        {
          id:           userId,
          email:        userEmail,
          nombre:       body.nombre,
          apellido:     body.apellido ?? null,
          tipo_usuario: body.tipo_usuario,
        },
        { onConflict: 'id' },
      );

    if (usrError) {
      console.error(`${TAG} upsert usuarios FAILED | code=${usrError.code} | msg=${usrError.message} | details=${usrError.details}`);
      return NextResponse.json({ error: usrError.message }, { status: 500 });
    }
    console.log(`${TAG} upsert usuarios OK`);

    // ── 3. Fila específica según tipo ────────────────────────────────────────────

    if (body.tipo_usuario === 'nutriologo') {

      console.log(`${TAG} insert nutriologos | usuario_id=${userId}`);
      const { error: nutrError } = await admin
        .from('nutriologos')
        .insert({ usuario_id: userId, numero_cedula: body.numero_colegiado ?? null });

      if (nutrError) {
        if (nutrError.code === '23505') {
          console.log(`${TAG} nutriologo ya existía (23505) — idempotente, OK`);
        } else {
          console.error(`${TAG} insert nutriologos FAILED | code=${nutrError.code} | msg=${nutrError.message} | details=${nutrError.details}`);
          return NextResponse.json({ error: nutrError.message }, { status: 500 });
        }
      } else {
        console.log(`${TAG} insert nutriologos OK`);
      }

    } else {

      // ── Paciente: validar código de invitación ─────────────────────────────────
      if (!body.codigo_nutriologo) {
        console.error(`${TAG} código nutriólogo faltante para paciente`);
        return NextResponse.json({ error: 'Código de nutriólogo requerido' }, { status: 400 });
      }

      const codigoNormalizado = body.codigo_nutriologo.toUpperCase().trim();
      console.log(`${TAG} buscando nutriólogo con codigo_invitacion=${codigoNormalizado}`);

      const { data: nutriologoRow, error: codigoError } = await admin
        .from('nutriologos')
        .select('id')
        .eq('codigo_invitacion', codigoNormalizado)
        .maybeSingle();

      if (codigoError || !nutriologoRow) {
        console.error(`${TAG} código no encontrado | supabaseErr:`, codigoError?.message ?? 'null');
        return NextResponse.json(
          { error: 'Código inválido, verificá con tu nutriólogo' },
          { status: 400 },
        );
      }

      console.log(`${TAG} insert pacientes | usuario_id=${userId} | nutriologo_id=${nutriologoRow.id}`);
      const { error: pacError } = await admin
        .from('pacientes')
        .insert({ usuario_id: userId, nutriologo_id: nutriologoRow.id });

      if (pacError) {
        if (pacError.code === '23505') {
          console.log(`${TAG} paciente ya existía (23505) — idempotente, OK`);
        } else {
          console.error(`${TAG} insert pacientes FAILED | code=${pacError.code} | msg=${pacError.message}`);
          return NextResponse.json({ error: pacError.message }, { status: 500 });
        }
      } else {
        console.log(`${TAG} insert pacientes OK`);
      }
    }

    console.log(`${TAG} ✓ perfil creado correctamente | userId=${userId} | tipo=${body.tipo_usuario}`);
    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error(`${TAG} excepción no controlada:`, err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
