-- ============================================================
-- NutriCR — Migración 2025-05-29
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ── 1. inventario: agregar columna paciente_id ───────────────────────────────
-- Permite filtrar el inventario por paciente (tiquetes escaneados).
-- ON DELETE SET NULL: si el paciente se elimina, los ítems quedan huérfanos
-- (no se pierden del inventario del nutriólogo).

ALTER TABLE inventario
  ADD COLUMN IF NOT EXISTS paciente_id UUID REFERENCES pacientes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS inventario_paciente_idx ON inventario(paciente_id);

-- ── 2. diario_comidas: crear tabla si no existe ──────────────────────────────
-- Almacena las fotos de comidas que sube el paciente.
-- Las fotos se guardan en Storage bucket "diario-comidas".

CREATE TABLE IF NOT EXISTS diario_comidas (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id  UUID        NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  foto_url     TEXT        NOT NULL,
  descripcion  TEXT,
  revisada     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS diario_comidas_paciente_idx
  ON diario_comidas(paciente_id, created_at DESC);

-- RLS: deshabilitado para desarrollo (igual que el resto de tablas)
-- ALTER TABLE diario_comidas ENABLE ROW LEVEL SECURITY;


-- ── 3. Storage bucket "diario-comidas" ──────────────────────────────────────
-- NOTA: los buckets NO se crean con SQL — deben crearse manualmente:
--
--   Supabase Dashboard → Storage → New bucket
--   Name:    diario-comidas
--   Public:  ✅ YES  (necesario para que getPublicUrl() funcione)
--
-- Si el bucket es privado, las URLs públicas devueltas por la API
-- no serán accesibles desde el <img> del frontend.
