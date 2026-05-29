// ─── Adherencia semanal — fórmula compartida ──────────────────────────────────
//
//  80 % → días únicos con registro en diario_comidas (meta: 7 días/semana)
//  10 % → recetas generadas en la semana              (meta: ≥ 3)
//  10 % → escaneos de tiquete en la semana            (meta: ≥ 1)
//
// Estado cualitativo
//   'Al día'  → adherencia ≥ 70
//   'Revisar' → 40 ≤ adherencia < 70
//   'Urgente' → adherencia < 40  O  sin foto en los últimos 3 días

export interface AdherenciaInput {
  fotosUnicos:   number; // días únicos con entradas en diario_comidas (ventana activa)
  recetasCount:  number; // recetas_generadas en últimos 7 días
  escaneosCount: number; // filas en inventario con paciente_id en últimos 7 días
  /**
   * Número de días que el paciente lleva activo en la ventana (1-7).
   * = min(7, daysSinceRegistration + 1)
   * Paciente registrado hoy → 1. Registrado hace ≥6 días → 7.
   * Se usa como denominador real para el componente de fotos, evitando
   * penalizar a pacientes nuevos por días que aún no han vivido.
   */
  diasActivos:   number;
}

export type EstadoAdherencia = 'Al día' | 'Revisar' | 'Urgente';

/** Devuelve un entero 0–100. */
export function calcAdherencia({
  fotosUnicos,
  recetasCount,
  escaneosCount,
  diasActivos,
}: AdherenciaInput): number {
  const denom    = Math.max(1, Math.min(diasActivos, 7));
  const fotos    = (Math.min(fotosUnicos,  denom) / denom) * 80;
  const recetas  = (Math.min(recetasCount,  3) / 3) * 10;
  const escaneos =  Math.min(escaneosCount, 1)       * 10;
  return Math.round(fotos + recetas + escaneos);
}

/**
 * Estado cualitativo.
 * `sinFotoReciente` = true si no hay ninguna foto en los últimos 3 días.
 */
export function calcEstado(
  adherencia: number,
  sinFotoReciente: boolean,
): EstadoAdherencia {
  if (sinFotoReciente || adherencia < 40) return 'Urgente';
  if (adherencia >= 70)                   return 'Al día';
  return 'Revisar';
}

// ─── Helper: convierte ISO → YYYY-MM-DD en zona horaria Costa Rica (UTC-6) ──

export function toCRDateKey(iso: string): string {
  const utcMs = new Date(iso).getTime();
  const crMs  = utcMs - 6 * 60 * 60 * 1000; // UTC-6, sin DST
  return new Date(crMs).toISOString().slice(0, 10);
}
