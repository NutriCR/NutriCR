-- ============================================================
-- NutriCR — Schema SQL para Supabase
-- ============================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLA: usuarios
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  nombre        VARCHAR(255) NOT NULL,
  apellido      VARCHAR(255),
  tipo_usuario  VARCHAR(50) NOT NULL CHECK (tipo_usuario IN ('nutriologo', 'paciente')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: nutriologos
-- ============================================================
CREATE TABLE IF NOT EXISTS nutriologos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  numero_cedula   VARCHAR(100),
  especialidad    VARCHAR(255),
  descripcion     TEXT,
  foto_url        VARCHAR(500),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS nutriologos_usuario_idx ON nutriologos(usuario_id);

-- ============================================================
-- TABLA: pacientes
-- ============================================================
CREATE TABLE IF NOT EXISTS pacientes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id          UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nutriologo_id       UUID REFERENCES nutriologos(id) ON DELETE SET NULL,
  fecha_nacimiento    DATE,
  peso                DECIMAL(5,2),
  altura              DECIMAL(5,2),
  objetivo            VARCHAR(255),
  alergias            TEXT[],
  condiciones_medicas TEXT[],
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS pacientes_usuario_idx ON pacientes(usuario_id);
CREATE INDEX IF NOT EXISTS pacientes_nutriologo_idx ON pacientes(nutriologo_id);

-- ============================================================
-- TABLA: planes_nutricionales
-- ============================================================
CREATE TABLE IF NOT EXISTS planes_nutricionales (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id      UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  nutriologo_id    UUID NOT NULL REFERENCES nutriologos(id),
  nombre           VARCHAR(255) NOT NULL,
  descripcion      TEXT,
  fecha_inicio     DATE,
  fecha_fin        DATE,
  calorias_diarias INTEGER,
  proteinas_g      DECIMAL(6,2),
  carbohidratos_g  DECIMAL(6,2),
  grasas_g         DECIMAL(6,2),
  activo           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS planes_paciente_idx ON planes_nutricionales(paciente_id);
CREATE INDEX IF NOT EXISTS planes_nutriologo_idx ON planes_nutricionales(nutriologo_id);

-- ============================================================
-- TABLA: inventario
-- ============================================================
CREATE TABLE IF NOT EXISTS inventario (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nutriologo_id         UUID NOT NULL REFERENCES nutriologos(id) ON DELETE CASCADE,
  nombre                VARCHAR(255) NOT NULL,
  categoria             VARCHAR(100),
  unidad_medida         VARCHAR(50),
  calorias_por_100g     DECIMAL(6,2),
  proteinas_por_100g    DECIMAL(6,2),
  carbohidratos_por_100g DECIMAL(6,2),
  grasas_por_100g       DECIMAL(6,2),
  stock                 DECIMAL(8,2) NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inventario_nutriologo_idx ON inventario(nutriologo_id);
CREATE INDEX IF NOT EXISTS inventario_categoria_idx ON inventario(categoria);

-- ============================================================
-- TABLA: recetas_generadas
-- ============================================================
CREATE TABLE IF NOT EXISTS recetas_generadas (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_nutricional_id  UUID REFERENCES planes_nutricionales(id) ON DELETE SET NULL,
  paciente_id          UUID REFERENCES pacientes(id) ON DELETE SET NULL,
  nutriologo_id        UUID REFERENCES nutriologos(id) ON DELETE SET NULL,
  nombre               VARCHAR(255) NOT NULL,
  descripcion          TEXT,
  ingredientes         JSONB,
  instrucciones        TEXT,
  calorias             INTEGER,
  tiempo_preparacion   INTEGER,
  tipo_comida          VARCHAR(50) CHECK (tipo_comida IN ('desayuno', 'almuerzo', 'cena', 'merienda')),
  generada_por_ia      BOOLEAN NOT NULL DEFAULT FALSE,
  prompt_usado         TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS recetas_paciente_idx ON recetas_generadas(paciente_id);
CREATE INDEX IF NOT EXISTS recetas_plan_idx ON recetas_generadas(plan_nutricional_id);
CREATE INDEX IF NOT EXISTS recetas_tipo_idx ON recetas_generadas(tipo_comida);

-- ============================================================
-- TABLA: pagos
-- ============================================================
CREATE TABLE IF NOT EXISTS pagos (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nutriologo_id             UUID NOT NULL REFERENCES nutriologos(id),
  paciente_id               UUID NOT NULL REFERENCES pacientes(id),
  monto                     DECIMAL(10,2) NOT NULL,
  moneda                    VARCHAR(10) NOT NULL DEFAULT 'CRC',
  estado                    VARCHAR(50) NOT NULL DEFAULT 'pendiente'
                              CHECK (estado IN ('pendiente', 'completado', 'fallido', 'reembolsado')),
  stripe_payment_intent_id  VARCHAR(255),
  stripe_customer_id        VARCHAR(255),
  descripcion               TEXT,
  fecha_pago                TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pagos_nutriologo_idx ON pagos(nutriologo_id);
CREATE INDEX IF NOT EXISTS pagos_paciente_idx ON pagos(paciente_id);
CREATE INDEX IF NOT EXISTS pagos_estado_idx ON pagos(estado);

-- ============================================================
-- FUNCIÓN: updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_usuarios
  BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_pacientes
  BEFORE UPDATE ON pacientes
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_planes
  BEFORE UPDATE ON planes_nutricionales
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_inventario
  BEFORE UPDATE ON inventario
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_pagos
  BEFORE UPDATE ON pagos
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (esqueleto — activar cuando haya auth)
-- ============================================================
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutriologos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE planes_nutricionales ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE recetas_generadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;

-- Política temporal: acceso total (SOLO para desarrollo)
-- IMPORTANTE: reemplazar con políticas reales antes de producción
CREATE POLICY "dev_all_usuarios" ON usuarios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all_nutriologos" ON nutriologos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all_pacientes" ON pacientes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all_planes" ON planes_nutricionales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all_inventario" ON inventario FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all_recetas" ON recetas_generadas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all_pagos" ON pagos FOR ALL USING (true) WITH CHECK (true);
