-- ── Web Push subscriptions ────────────────────────────────────────────────────
-- Ejecutar en Supabase Dashboard → SQL Editor (o vía CLI: supabase db push)
--
-- Guarda las suscripciones PushSubscription de cada paciente para que el
-- servidor pueda enviar notificaciones push cuando el nutriólogo envíe notas.

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID         NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  endpoint    TEXT         NOT NULL,
  subscription JSONB       NOT NULL,   -- PushSubscriptionJSON completo (endpoint + keys)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Un paciente puede tener varias suscripciones (múltiples dispositivos),
  -- pero cada endpoint es único por paciente.
  CONSTRAINT push_subscriptions_paciente_endpoint_key UNIQUE (paciente_id, endpoint)
);

-- Índice para búsquedas por paciente al enviar notificaciones
CREATE INDEX IF NOT EXISTS push_subscriptions_paciente_idx
  ON push_subscriptions (paciente_id);

-- RLS: solo el service-role (backend) puede leer/escribir.
-- El cliente no accede a esta tabla directamente.
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Política vacía → solo el service-role (que bypasea RLS) puede operar.
-- Si en el futuro necesitas que el paciente pueda borrar su propio registro:
-- CREATE POLICY "paciente puede borrar su suscripción"
--   ON push_subscriptions FOR DELETE
--   USING (paciente_id = auth.uid());
