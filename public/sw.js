// ── v3: fix "Response served by service worker has redirections" en iOS ───────
// Las navegaciones (mode === 'navigate') se dejan pasar SIEMPRE a la red.
// Esto garantiza que la ruta raíz "/" y cualquier redirección de autenticación
// las resuelva Next.js en el servidor, sin interferencia del service worker.
const CACHE_NAME = 'nutricr-v3';

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
