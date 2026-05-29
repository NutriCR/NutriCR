import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireNutriologo } from '@/lib/supabase/auth-helpers';
import { sendPush } from '@/lib/web-push';

// ── GET /api/pacientes/[id]/notas ──────────────────────────────────────────────

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireNutriologo();
  if (!auth.ok) return auth.response;

  const { data, error } = await createAdminClient()
    .from('notas')
    .select('*')
    .eq('paciente_id', params.id)
    .order('fecha', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

// ── POST /api/pacientes/[id]/notas ────────────────────────────────────────────

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireNutriologo();
  if (!auth.ok) return auth.response;

  const body = await request.json() as { mensaje: string };

  if (!body.mensaje?.trim()) {
    return NextResponse.json({ error: 'mensaje no puede estar vacío' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from('notas')
    .insert({
      paciente_id:   params.id,
      nutriologo_id: auth.data.nutriologoId,
      mensaje:       body.mensaje.trim(),
      fecha:         new Date().toISOString(),
      leida:         false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Crear notificación en BD + enviar Web Push — ambos fallos son silenciosos
  await Promise.all([

    admin
      .from('notificaciones')
      .insert({
        paciente_id: params.id,
        tipo:        'nota',
        mensaje:     body.mensaje.trim(),
        leida:       false,
      })
      .then(({ error: notifErr }) => {
        if (notifErr) console.error('[notas] Error al crear notificación:', notifErr.message);
      }),

    // Web Push — buscar suscripciones activas del paciente y notificar
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: subs } = await (admin as any)
          .from('push_subscriptions')
          .select('subscription')
          .eq('paciente_id', params.id);

        if (!subs?.length) return;

        const preview = body.mensaje.trim().slice(0, 100);

        await Promise.allSettled(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          subs.map((row: any) =>
            sendPush(row.subscription, {
              title: 'Mensaje de tu nutricionista',
              body:  preview,
              icon:  '/icons/icon-192x192.png',
            }),
          ),
        );
      } catch (pushErr) {
        console.error('[notas] Error enviando push:', pushErr);
      }
    })(),

  ]);

  return NextResponse.json({ data }, { status: 201 });
}
