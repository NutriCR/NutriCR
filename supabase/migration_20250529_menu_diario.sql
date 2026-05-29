-- ── Persistencia de menú diario en recetas_generadas ─────────────────────────
-- Ejecutar en Supabase Dashboard → SQL Editor
--
-- Se reutiliza la tabla existente recetas_generadas agregando dos columnas:
--   • fecha  DATE  — solo la fecha (YYYY-MM-DD) del día del menú
--   • menu   JSONB — el menú completo del día (desayuno/almuerzo/cena/merienda)
--
-- Los registros de "menú completo" se distinguen de los registros individuales
-- porque tienen tipo_comida IS NULL.

ALTER TABLE recetas_generadas
  ADD COLUMN IF NOT EXISTS fecha DATE,
  ADD COLUMN IF NOT EXISTS menu  JSONB;

-- Índice para búsqueda rápida por fecha
CREATE INDEX IF NOT EXISTS recetas_generadas_fecha_idx
  ON recetas_generadas (fecha);

-- Índice compuesto: lookup de menú diario de un paciente (solo filas de menú completo)
CREATE INDEX IF NOT EXISTS recetas_generadas_paciente_fecha_idx
  ON recetas_generadas (paciente_id, fecha)
  WHERE tipo_comida IS NULL;
