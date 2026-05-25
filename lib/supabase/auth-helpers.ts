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

    const { data } = await createAdminClient()
      .from('nutriologos')
      .select('id')
      .eq('usuario_id', user.id)
      .single();

    if (!data) return { ok: false, response: forbidden('Nutriólogo no encontrado') };

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
