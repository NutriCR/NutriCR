// ─── Server-side Web Push helper ─────────────────────────────────────────────
// Only import this module from Server Components / Route Handlers.
// web-push is listed in serverComponentsExternalPackages so it's never bundled
// for the browser.

import webpush from 'web-push';

const publicKey  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const privateKey = process.env.VAPID_PRIVATE_KEY!;
const email      = process.env.VAPID_EMAIL ?? 'mailto:admin@nutrismartcr.com';

webpush.setVapidDetails(email, publicKey, privateKey);

export interface PushPayload {
  title: string;
  body:  string;
  icon?: string;
}

/**
 * Sends a Web Push notification to a single subscription.
 * Throws on any transport error — callers should catch silently when push is
 * non-critical (e.g. the subscription endpoint is gone / expired).
 */
export async function sendPush(
  subscription: webpush.PushSubscription,
  payload: PushPayload,
): Promise<void> {
  await webpush.sendNotification(subscription, JSON.stringify(payload));
}
