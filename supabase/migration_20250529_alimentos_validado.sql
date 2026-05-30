-- ── Agregar columna `validado` a tabla alimentos ─────────────────────────────
-- Ejecutar en Supabase Dashboard → SQL Editor

ALTER TABLE alimentos
  ADD COLUMN IF NOT EXISTS validado BOOLEAN NOT NULL DEFAULT false;

-- Índice para filtrar por estado de validación
CREATE INDEX IF NOT EXISTS alimentos_validado_idx
  ON alimentos (validado);

-- Política UPDATE para service role (admin client)
CREATE POLICY "alimentos_update_service"
  ON alimentos FOR UPDATE
  USING (true)
  WITH CHECK (true);
