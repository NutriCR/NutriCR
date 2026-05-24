-- ============================================================
-- NutriCR — Migración 2025-05-24
-- Ejecutar en Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- ============================================================

-- ── 1. mediciones_inbody ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mediciones_inbody (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id       UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  fecha             DATE NOT NULL,
  peso              DECIMAL(5,2),          -- kg
  grasa_porcentaje  DECIMAL(5,2),          -- %
  musculo_kg        DECIMAL(5,2),          -- kg
  agua_porcentaje   DECIMAL(5,2),          -- %
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mediciones_inbody_paciente_fecha_idx
  ON mediciones_inbody(paciente_id, fecha);

-- ── 2. notas ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notas (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id    UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  nutriologo_id  UUID NOT NULL REFERENCES nutriologos(id) ON DELETE CASCADE,
  mensaje        TEXT NOT NULL,
  fecha          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  leida          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notas_paciente_fecha_idx
  ON notas(paciente_id, fecha DESC);

-- ── 3. Columna restricciones_dieteticas en planes_nutricionales ─────────────
ALTER TABLE planes_nutricionales
  ADD COLUMN IF NOT EXISTS restricciones_dieteticas TEXT[];

-- ── 4. fecha_vencimiento en inventario (migración previa) ───────────────────
ALTER TABLE inventario
  ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE;

-- ── RLS (deshabilitar para desarrollo — habilitar en producción) ─────────────
-- ALTER TABLE mediciones_inbody ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE notas              ENABLE ROW LEVEL SECURITY;
