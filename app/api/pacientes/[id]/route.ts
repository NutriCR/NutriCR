import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireNutriologo } from '@/lib/supabase/auth-helpers';
import { calcAdherencia, calcEstado, toCRDateKey } from '@/lib/adherencia';

// ── GET /api/pacientes/[id] ────────────────────────────────────────────────────

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireNutriologo();
  if (!auth.ok) return auth.response;

  const supabase = createAdminClient();
  const { id } = params;

  const { data: paciente, error: pErr } = await supabase
    .from('pacientes')
    .select('*, usuarios(nombre, apellido, email)')
    .eq('id', id)
    .single();

  if (pErr || !paciente) {
    return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });
  }

  // Verificar que el paciente pertenece al nutriólogo autenticado
  if (paciente.nutriologo_id !== auth.data.nutriologoId) {
    return NextResponse.json({ error: 'Sin acceso a este paciente' }, { status: 403 });
  }

  const hace7 = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const hace3 = new Date(Date.now() - 3 * 86_400_000).toISOString();

  const [planRes, fotosRes, recetasRes] = await Promise.all([

    supabase
      .from('planes_nutricionales')
      .select('*')
      .eq('paciente_id', id)
      .eq('activo', true)
      .maybeSingle(),

    supabase
      .from('diario_comidas')
      .select('created_at')
      .eq('paciente_id', id)
      .gte('created_at', hace7),

    supabase
      .from('recetas_generadas')
      .select('created_at')
      .eq('paciente_id', id)
      .gte('created_at', hace7),

    // Placeholder — escaneos se obtienen por separado (requiere migración en BD)
    Promise.resolve({ data: [] as never[] }),
  ]);

  const plan = planRes.data;

  // Escaneos de tiquete: query separada hasta que se aplique la migración de paciente_id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const escaneosRaw = await (supabase as any)
    .from('inventario')
    .select('id')
    .eq('paciente_id', id)
    .gte('created_at', hace7)
    .catch(() => ({ data: null }));

  // Días únicos con foto en los últimos 7 días
  const fotosUnicos = new Set(
    (fotosRes.data ?? []).map((f) => toCRDateKey(f.created_at as string)),
  ).size;

  const recetasCount  = (recetasRes.data  ?? []).length;
  const escaneosCount = (escaneosRaw.data ?? []).length;

  // ¿Tiene alguna foto en los últimos 3 días?
  const sinFotoReciente = !(fotosRes.data ?? []).some(
    (f) => (f.created_at as string) >= hace3,
  );

  const adherencia = calcAdherencia({ fotosUnicos, recetasCount, escaneosCount });
  const estado     = calcEstado(adherencia, sinFotoReciente);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const usuario = (paciente as any).usuarios as { nombre: string; apellido: string | null; email: string } | null;

  return NextResponse.json({
    paciente: {
      id:                  paciente.id,
      nombre:              usuario?.nombre              ?? '',
      apellido:            usuario?.apellido            ?? null,
      email:               usuario?.email               ?? '',
      objetivo:            paciente.objetivo,
      condiciones_medicas: paciente.condiciones_medicas ?? [],
      alergias:            paciente.alergias            ?? [],
      peso:                paciente.peso,
      altura:              paciente.altura,
      fecha_nacimiento:    paciente.fecha_nacimiento,
    },
    plan: plan ?? null,
    adherencia,
    estado,          // 'Al día' | 'Revisar' | 'Urgente'
  });
}

// ── PATCH /api/pacientes/[id] ──────────────────────────────────────────────────

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireNutriologo();
  if (!auth.ok) return auth.response;

  const supabase = createAdminClient();
  const body = await request.json() as {
    objetivo?: string | null;
    condiciones_medicas?: string[];
    alergias?: string[];            // ← nuevo
  };

  const { error } = await supabase
    .from('pacientes')
    .update({
      ...(body.objetivo !== undefined            && { objetivo:            body.objetivo }),
      ...(body.condiciones_medicas !== undefined && { condiciones_medicas: body.condiciones_medicas }),
      ...(body.alergias            !== undefined && { alergias:            body.alergias }),  // ← nuevo
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .eq('nutriologo_id', auth.data.nutriologoId); // guard

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
