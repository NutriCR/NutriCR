// ── v4: push notifications + fix "Response served by service worker has
//        redirections" en iOS ─────────────────────────────────────────────────
//
// Cambios respecto a v3:
//   • Agrega manejadores `push` y `notificationclick` para Web Push API.
//   • Versión de caché bumpeada para que el SW viejo sea reemplazado.

const CACHE_NAME = 'nutricr-v4';

// Sólo se pre-cachean assets estáticos de la app del paciente, nunca HTML.
const STATIC_ASSETS = [
  '/paciente/inicio',
  '/paciente/plan',
  '/paciente/recetas',
  '/paciente/perfil',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
      ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // ── Regla 1: IGNORAR todas las navegaciones de página (HTML) ──────────────
  // Incluye la raíz "/", rutas de auth, dashboard, etc.
  // Next.js y su middleware manejan la lógica de redirección en el servidor.
  if (request.mode === 'navigate') return;

  // ── Regla 2: Solo procesar GET ────────────────────────────────────────────
  if (request.method !== 'GET') return;

  const url = request.url;

  // ── Regla 3: Nunca cachear auth, API, Next.js internals ni Supabase ───────
  if (
    url.includes('/auth/') ||
    url.includes('/api/') ||
    url.includes('/_next/') ||
    url.includes('supabase.co')
  ) return;

  // ── Regla 4: Cache-first para assets estáticos (imágenes, fuentes, etc.) ──
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request).then((response) => {
        if (response.ok) {
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(request, response.clone()));
        }
        return response;
      });
      return cached ?? networkFetch;
    }),
  );
});

// ── Web Push ─────────────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  let payload = { title: 'NutriCR', body: 'Tienes un nuevo mensaje.' };
  try {
    if (event.data) payload = event.data.json();
  } catch {
    // payload remains default
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body:  payload.body,
      icon:  payload.icon  ?? '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      // Vibration pattern (ms on/off) — ignored on desktop
      vibrate: [200, 100, 200],
      // Keep notification visible until user interacts with it
      requireInteraction: false,
      data: { url: '/paciente/inicio' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url ?? '/paciente/inicio';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // If the app is already open in a tab, focus it and navigate
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            if ('navigate' in client) client.navigate(targetUrl);
            return;
          }
        }
        // Otherwise open a new tab
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      }),
  );
});
