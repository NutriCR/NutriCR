import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * ID de prueba — reemplazar con el nutriólogo autenticado cuando se implemente auth.
 */
const TEST_NUTRIOLOGO_ID = '22222222-2222-2222-2222-222222222222';

// ─── Mock data (se usa cuando no hay pacientes reales) ────────────────────────

const now = Date.now();
const hace = (ms: number) => new Date(now - ms).toISOString();

const MOCK_PACIENTES = [
  {
    id: 'mock-1',
    nombre: 'María',
    apellido: 'González',
    email: 'maria.g@nutricr.test',
    objetivo: 'Pérdida de peso',
    adherencia: 85,
    ultimaActividad: hace(2 * 60 * 60 * 1000),       // hace 2 h
  },
  {
    id: 'mock-2',
    nombre: 'José',
    apellido: 'Jiménez',
    email: 'jose.j@nutricr.test',
    objetivo: 'Ganancia muscular',
    adherencia: 91,
    ultimaActividad: hace(30 * 60 * 1000),            // hace 30 min
  },
  {
    id: 'mock-3',
    nombre: 'Laura',
    apellido: 'Vargas',
    email: 'laura.v@nutricr.test',
    objetivo: 'Recuperación deportiva',
    adherencia: 44,
    ultimaActividad: hace(3 * 24 * 60 * 60 * 1000),  // hace 3 días
  },
  {
    id: 'mock-4',
    nombre: 'Carlos',
    apellido: 'Ramírez',
    email: 'carlos.r@nutricr.test',
    objetivo: 'Control de colesterol',
    adherencia: 62,
    ultimaActividad: hace(24 * 60 * 60 * 1000),      // hace 1 día
  },
  {
    id: 'mock-5',
    nombre: 'Ana',
    apellido: 'Mora',
    email: 'ana.m@nutricr.test',
    objetivo: 'Control de diabetes',
    adherencia: 28,
    ultimaActividad: hace(5 * 24 * 60 * 60 * 1000),  // hace 5 días
  },
];

const MOCK_STATS = {
  totalPacientes:     MOCK_PACIENTES.length,
  adherenciaPromedio: Math.round(
    MOCK_PACIENTES.reduce((s, p) => s + p.adherencia, 0) / MOCK_PACIENTES.length,
  ),
  ingresosMes: 250000, // ₡250,000 (mock)
};

// ─── GET /api/dashboard ───────────────────────────────────────────────────────

export async function GET() {
  try {
    const supabase = createAdminClient();

    // 1 — Pacientes del nutriólogo
    const { data: pacientesRaw, error: pacErr } = await supabase
      .from('pacientes')
      .select('id, usuario_id, objetivo')
      .eq('nutriologo_id', TEST_NUTRIOLOGO_ID);

    if (pacErr) throw new Error(pacErr.message);

    // Sin pacientes reales → devolver mock para que el dashboard no quede vacío
    if (!pacientesRaw || pacientesRaw.length === 0) {
      return NextResponse.json({
        stats:       MOCK_STATS,
        pacientes:   MOCK_PACIENTES,
        isMockData:  true,
      });
    }

    // 2 — Datos de usuario para cada paciente
    const usuarioIds = pacientesRaw.map((p) => p.usuario_id);
    const { data: usuariosData } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido, email')
      .in('id', usuarioIds);

    const usuariosMap = new Map(
      (usuariosData ?? []).map((u) => [u.id, u]),
    );

    // 3 — Adherencia semanal desde recetas_generadas (últimos 7 días)
    //     Proxy: cada receta generada = 1 interacción; max 7 días posibles → adherencia = min(count/7, 1)*100
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    const pacienteIds  = pacientesRaw.map((p) => p.id);

    const { data: recetasData } = await supabase
      .from('recetas_generadas')
      .select('paciente_id, created_at')
      .in('paciente_id', pacienteIds)
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false });

    // Contar recetas por paciente y registrar última actividad
    const recetasPor = new Map<string, number>();
    const ultimaAct  = new Map<string, string>();

    for (const r of recetasData ?? []) {
      if (!r.paciente_id) continue;
      recetasPor.set(r.paciente_id, (recetasPor.get(r.paciente_id) ?? 0) + 1);
      if (!ultimaAct.has(r.paciente_id)) ultimaAct.set(r.paciente_id, r.created_at);
    }

    // 4 — Ingresos del mes (pagos completados desde el 1ro del mes actual)
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const { data: pagosData } = await supabase
      .from('pagos')
      .select('monto')
      .eq('nutriologo_id', TEST_NUTRIOLOGO_ID)
      .eq('estado', 'completado')
      .gte('fecha_pago', inicioMes.toISOString());

    const ingresosMes = (pagosData ?? []).reduce((s, p) => s + (p.monto ?? 0), 0);

    // 5 — Construir lista de pacientes
    const pacientes = pacientesRaw.map((p) => {
      const usuario   = usuariosMap.get(p.usuario_id);
      const numRec    = recetasPor.get(p.id) ?? 0;
      const adherencia = Math.min(100, Math.round((numRec / 7) * 100));

      return {
        id:              p.id,
        nombre:          usuario?.nombre   ?? 'Desconocido',
        apellido:        usuario?.apellido ?? null,
        email:           usuario?.email    ?? '',
        objetivo:        p.objetivo,
        adherencia,
        ultimaActividad: ultimaAct.get(p.id) ?? null,
      };
    });

    // Ordenar: urgentes primero, luego por adherencia asc
    pacientes.sort((a, b) => a.adherencia - b.adherencia);

    const adherenciaPromedio = Math.round(
      pacientes.reduce((s, p) => s + p.adherencia, 0) / pacientes.length,
    );

    return NextResponse.json({
      stats: {
        totalPacientes: pacientes.length,
        adherenciaPromedio,
        ingresosMes,
      },
      pacientes,
      isMockData: false,
    });

  } catch (err: unknown) {
    console.error('[dashboard] GET error:', err);
    const message = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
