import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requirePaciente } from '@/lib/supabase/auth-helpers';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Tipo de comida según hora de Costa Rica (UTC-6). */
function getTipoComida(): 'desayuno' | 'almuerzo' | 'cena' | 'merienda' {
  const crHour = (new Date().getUTCHours() - 6 + 24) % 24;
  if (crHour >= 6  && crHour < 11) return 'desayuno';
  if (crHour >= 11 && crHour < 15) return 'almuerzo';
  if (crHour >= 15 && crHour < 20) return 'cena';
  return 'merienda';
}

// ─── GET /api/paciente/inicio ─────────────────────────────────────────────────
// Devuelve en una sola llamada todo lo necesario para la pantalla de inicio:
//   - mediciones InBody (últimas 12, orden ASC para el gráfico)
//   - plan nutricional activo
//   - receta sugerida según la hora del día
//   - notificaciones no leídas (máx 2, para "Notas del nutriólogo")
//   - fechas de entradas de diario de los últimos 30 días (para adherencia semanal)
//   - nombre del paciente
//   - tipoComida calculado en servidor

export async function GET() {
  const auth = await requirePaciente();
  if (!auth.ok) return auth.response;

  const { pacienteId, userId } = auth.data;
  const admin      = createAdminClient();
  const tipoComida = getTipoComida();

  // Inicio de ventana para adherencia: hace 30 días (cubre streak y semana actual)
  const hace30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Ejecutar todas las consultas en paralelo
  const [
    medicionesRes,
    planRes,
    recetaRes,
    notifRes,
    diarioRes,
    usuarioRes,
  ] = await Promise.all([

    // Últimas 12 mediciones, orden ascendente para la gráfica
    admin
      .from('mediciones_inbody')
      .select('id, fecha, peso, grasa_porcentaje, musculo_kg')
      .eq('paciente_id', pacienteId)
      .order('fecha', { ascending: true })
      .limit(12),

    // Plan nutricional activo
    admin
      .from('planes_nutricionales')
      .select('calorias_diarias, proteinas_g, carbohidratos_g, grasas_g')
      .eq('paciente_id', pacienteId)
      .eq('activo', true)
      .maybeSingle(),

    // Receta más reciente del tipo de comida actual
    admin
      .from('recetas_generadas')
      .select('id, nombre, calorias, tiempo_preparacion_minutos, tipo_comida')
      .eq('paciente_id', pacienteId)
      .eq('tipo_comida', tipoComida)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    // Las 2 notificaciones no leídas más recientes (para la sección "Notas")
    admin
      .from('notificaciones')
      .select('id, tipo, mensaje, created_at')
      .eq('paciente_id', pacienteId)
      .eq('leida', false)
      .order('created_at', { ascending: false })
      .limit(2),

    // Fechas de entradas de diario de los últimos 30 días (solo created_at)
    // El cliente convierte a fecha local para los puntos de adherencia
    admin
      .from('diario_comidas')
      .select('created_at')
      .eq('paciente_id', pacienteId)
      .gte('created_at', hace30)
      .order('created_at', { ascending: false }),

    // Nombre del paciente
    admin
      .from('usuarios')
      .select('nombre, apellido')
      .eq('id', userId)
      .maybeSingle(),
  ]);

  // Extraer solo las fechas ISO del diario (el cliente agrupa por día local)
  const diarioFechas = (diarioRes.data ?? []).map((r) => r.created_at as string);

  return NextResponse.json({
    mediciones:    medicionesRes.data ?? [],
    plan:          planRes.data       ?? null,
    recetaSugerida: recetaRes.data    ?? null,
    notificaciones: notifRes.data     ?? [],   // ← array en vez de single
    diarioFechas,                              // ← nuevo: para adherencia
    tipoComida,
    paciente: {
      nombre:   usuarioRes.data?.nombre   ?? 'Paciente',
      apellido: usuarioRes.data?.apellido ?? null,
    },
  });
}
