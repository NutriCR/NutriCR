-- ============================================================
-- NutriCR — Migración Auth (2025-05-24)
-- Ejecutar en Supabase SQL Editor → New query → Run
-- ============================================================

-- ── 1. Tabla codigos_invitacion ─────────────────────────────────────────────
-- Almacena los códigos de 8 dígitos que genera el nutriólogo para vincular pacientes.
CREATE TABLE IF NOT EXISTS codigos_invitacion (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nutriologo_id UUID NOT NULL REFERENCES nutriologos(id) ON DELETE CASCADE,
  codigo        VARCHAR(9) UNIQUE NOT NULL,   -- formato XXXX-XXXX (9 chars con guión)
  usado         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usado_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS codigos_invitacion_nutriologo_idx ON codigos_invitacion(nutriologo_id);
CREATE INDEX IF NOT EXISTS codigos_invitacion_codigo_idx     ON codigos_invitacion(codigo);

-- ── 2. IMPORTANTE: usuarios.id debe coincidir con auth.users.id ─────────────
-- Al crear usuarios desde la app, siempre pasar id = auth.users.id
-- La columna ya es UUID con DEFAULT gen_random_uuid(), así que se puede insertar
-- un UUID específico (el de Supabase Auth) sin cambiar el schema.
--
-- Si ya tienes filas de prueba con IDs distintos, puedes limpiarlas así:
--   DELETE FROM nutriologos WHERE usuario_id NOT IN (SELECT id FROM auth.users);
--   DELETE FROM pacientes   WHERE usuario_id NOT IN (SELECT id FROM auth.users);
--   DELETE FROM usuarios;

-- ── 3. RLS (opcional — para producción) ─────────────────────────────────────
-- Habilitar cuando se quiera restringir acceso en la base de datos:
-- ALTER TABLE codigos_invitacion ENABLE ROW LEVEL SECURITY;
