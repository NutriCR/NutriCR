-- ── Base de datos nutricional compartida ──────────────────────────────────────
-- Ejecutar en Supabase Dashboard → SQL Editor
--
-- 1. Nueva tabla `alimentos`  — catálogo nutricional compartido
-- 2. ALTER TABLE `inventario` — agrega columna alimento_id como FK opcional
-- ──────────────────────────────────────────────────────────────────────────────

-- Habilitar extensión pg_trgm para búsqueda fuzzy por nombre
-- (ya viene instalada en Supabase por defecto)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── 1. Tabla alimentos ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS alimentos (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre          TEXT          NOT NULL,
  codigo_barras   TEXT,
  calorias_100g   NUMERIC(8,2)  NOT NULL DEFAULT 0,
  proteina_100g   NUMERIC(8,2)  NOT NULL DEFAULT 0,
  carbos_100g     NUMERIC(8,2)  NOT NULL DEFAULT 0,
  grasas_100g     NUMERIC(8,2)  NOT NULL DEFAULT 0,
  fibra_100g      NUMERIC(8,2),
  fuente          TEXT          NOT NULL DEFAULT 'manual'
                  CHECK (fuente IN ('openfoodfacts', 'usda', 'manual', 'ia')),
  pais            TEXT,
  imagen_url      TEXT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Índice único por código de barras (solo filas donde no es NULL)
CREATE UNIQUE INDEX IF NOT EXISTS alimentos_codigo_barras_unique
  ON alimentos (codigo_barras)
  WHERE codigo_barras IS NOT NULL;

-- Índice GIN para búsqueda fuzzy por nombre (ILIKE / similarity)
CREATE INDEX IF NOT EXISTS alimentos_nombre_trgm_idx
  ON alimentos USING gin (nombre gin_trgm_ops);

-- RLS: lectura pública, escritura solo vía service role (admin client)
ALTER TABLE alimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alimentos_select_all"
  ON alimentos FOR SELECT
  USING (true);

CREATE POLICY "alimentos_insert_service"
  ON alimentos FOR INSERT
  WITH CHECK (true);

-- ── 2. Vincular inventario con alimentos ──────────────────────────────────────

ALTER TABLE inventario
  ADD COLUMN IF NOT EXISTS alimento_id UUID
    REFERENCES alimentos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS inventario_alimento_id_idx
  ON inventario (alimento_id)
  WHERE alimento_id IS NOT NULL;
