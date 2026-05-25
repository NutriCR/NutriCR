// ── v2: invalida la caché anterior (v1 tenía CSP desactualizado) ─────────────
const CACHE_NAME = 'nutricr-v2';
const STATIC_ASSETS = ['/paciente/inicio', '/paciente/plan', '/paciente/recetas', '/paciente/perfil'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  // Activa inmediatamente sin esperar a que se cierren pestañas anteriores
  self.skipWaiting();
});

// Permite que la página fuerce la activación enviando { type: 'SKIP_WAITING' }
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Eliminar TODAS las cachés anteriores (nutricr-v1, etc.)
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  // Nunca cachear: rutas de auth, API, Next.js internals ni Supabase
  if (
    url.includes('/auth/') ||
    url.includes('/api/') ||
    url.includes('/_next/') ||
    url.includes('supabase.co')
  ) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
      return cached ?? networkFetch;
    })
  );
});
