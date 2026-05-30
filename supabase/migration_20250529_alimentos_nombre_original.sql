-- ── Agregar columna nombre_original a tabla alimentos ────────────────────────
-- Ejecutar en Supabase Dashboard → SQL Editor
--
-- Guarda el nombre en inglés de USDA, mientras que `nombre` pasa a tener
-- el nombre traducido al español (por Claude Haiku).

ALTER TABLE alimentos
  ADD COLUMN IF NOT EXISTS nombre_original TEXT;

-- Índice parcial para buscar alimentos USDA sin traducir
CREATE INDEX IF NOT EXISTS alimentos_sin_traducir_idx
  ON alimentos (id)
  WHERE fuente = 'usda' AND nombre_original IS NULL;
