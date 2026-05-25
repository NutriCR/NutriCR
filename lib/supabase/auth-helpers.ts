import { NextResponse } from 'next/server';
import { createAuthClient, createAdminClient } from './server';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuthOk<T>  = { ok: true;  data: T };
export type AuthFail   = { ok: false; response: NextResponse };
export type AuthResult<T> = AuthOk<T> | AuthFail;

export interface NutriologoSession {
  userId:       string;
  nutriologoId: string;
}

export interface PacienteSession {
  userId:       string;
  pacienteId:   string;
  nutriologoId: string | null; // ID del nutriólogo asignado
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

function unauthorized() {
  return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
}
function forbidden(msg = 'Sin acceso') {
  return NextResponse.json({ error: msg }, { status: 403 });
}

// ─── requireNutriologo ────────────────────────────────────────────────────────
/**
 * Verifica que haya una sesión activa de tipo nutriólogo.
 * Retorna { ok: true, data: { userId, nutriologoId } } o { ok: false, response }.
 *
 * Uso en Route Handlers:
 *   const auth = await requireNutriologo();
 *   if (!auth.ok) return auth.response;
 *   const { nutriologoId } = auth.data;
 */
export async function requireNutriologo(): Promise<AuthResult<NutriologoSession>> {
  try {
    const { data: { user } } = await createAuthClient().auth.getUser();
    if (!user) return { ok: false, response: unauthorized() };

    const admin = createAdminClient();

    // Buscar la fila en nutriologos
    let { data } = await admin
      .from('nutriologos')
      .select('id')
      .eq('usuario_id', user.id)
      .single();

    // Si no existe la fila pero el JWT declara tipo_usuario = 'nutriologo',
    // la creamos automáticamente. Esto cubre cuentas creadas directamente en
    // el dashboard de Supabase sin pasar por el flujo de registro.
    if (!data) {
      const tipoMeta = user.user_metadata?.tipo_usuario as string | undefined;
      if (tipoMeta !== 'nutriologo') {
        return { ok: false, response: forbidden('Nutriólogo no encontrado') };
      }

      console.warn('[requireNutriologo] Fila faltante — auto-provisionando nutriologo para userId:', user.id);

      // Asegurar fila en usuarios
      await admin.from('usuarios').upsert(
        {
          id:           user.id,
          email:        user.email ?? '',
          nombre:       (user.user_metadata?.nombre as string | undefined) ?? 'Nutriólogo',
          apellido:     (user.user_metadata?.apellido as string | undefined) ?? null,
          tipo_usuario: 'nutriologo',
        },
        { onConflict: 'id' },
      );

      // Crear fila en nutriologos
      const { data: created, error: insertErr } = await admin
        .from('nutriologos')
        .insert({ usuario_id: user.id })
        .select('id')
        .single();

      if (insertErr || !created) {
        console.error('[requireNutriologo] insert nutriologos falló:', insertErr?.message);
        return { ok: false, response: forbidden('Nutriólogo no encontrado') };
      }

      data = created;
    }

    return { ok: true, data: { userId: user.id, nutriologoId: data.id } };
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'Error de autenticación' }, { status: 500 }) };
  }
}

// ─── requirePaciente ──────────────────────────────────────────────────────────
/**
 * Verifica que haya una sesión activa de tipo paciente.
 * Retorna el pacienteId y el nutriologoId asignado.
 */
export async function requirePaciente(): Promise<AuthResult<PacienteSession>> {
  try {
    const { data: { user } } = await createAuthClient().auth.getUser();
    if (!user) return { ok: false, response: unauthorized() };

    const { data } = await createAdminClient()
      .from('pacientes')
      .select('id, nutriologo_id')
      .eq('usuario_id', user.id)
      .single();

    if (!data) return { ok: false, response: forbidden('Paciente no encontrado') };

    return {
      ok: true,
      data: {
        userId:       user.id,
        pacienteId:   data.id,
        nutriologoId: data.nutriologo_id,
      },
    };
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'Error de autenticación' }, { status: 500 }) };
  }
}

// ─── requireAuth ──────────────────────────────────────────────────────────────
/**
 * Verifica sesión activa sin importar el tipo de usuario.
 * Útil para rutas compartidas o de solo lectura.
 */
export async function requireAuth(): Promise<AuthResult<{ userId: string }>> {
  try {
    const { data: { user } } = await createAuthClient().auth.getUser();
    if (!user) return { ok: false, response: unauthorized() };
    return { ok: true, data: { userId: user.id } };
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'Error de autenticación' }, { status: 500 }) };
  }
}
