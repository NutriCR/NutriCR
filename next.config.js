/** @type {import('next').NextConfig} */

// ── Content-Security-Policy ───────────────────────────────────────────────────
// 'unsafe-eval'   → requerido por @supabase/realtime-js (phoenix channels)
// 'unsafe-inline' → requerido por Next.js (inline style/script en RSC)
// connect-src     → fetch a Supabase Auth/DB/Realtime y a Anthropic API
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
].join('; ');

const nextConfig = {
  experimental: {
    // Next.js 14.2 still uses this key (renamed to serverExternalPackages in Next.js 15)
    serverComponentsExternalPackages: ['@anthropic-ai/sdk'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  async headers() {
    return [
      // CSP para todas las rutas
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: CSP },
        ],
      },
      // Service worker: sin caché + tipo correcto
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
