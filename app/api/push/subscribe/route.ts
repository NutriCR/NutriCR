import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requirePaciente } from '@/lib/supabase/auth-helpers';

// ── POST /api/push/subscribe ──────────────────────────────────────────────────
// Saves (or refreshes) the patient's Web Push subscription in Supabase so the
// server can send push notifications when the nutritionist sends a note.
//
// Body: { subscription: PushSubscriptionJSON }
//
// Uses UPSERT on (paciente_id, endpoint) so re-subscribing after the SW is
// updated just refreshes the keys without creating duplicate rows.

export async function POST(request: Request) {
  const auth = await requirePaciente();
  if (!auth.ok) return auth.response;

  const { pacienteId } = auth.data;

  let body: { subscription?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const sub = body.subscription as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  } | undefined;

  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return NextResponse.json({ error: 'Subscription incompleta' }, { status: 400 });
  }

  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('push_subscriptions')
    .upsert(
      {
        paciente_id:  pacienteId,
        endpoint:     sub.endpoint,
        subscription: sub,           // full JSON stored for sendNotification()
      },
      { onConflict: 'paciente_id,endpoint' },
    );

  if (error) {
    console.error('[push/subscribe] upsert error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
