import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ServiceWorkerUpdater from '@/components/ServiceWorkerUpdater';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Nutri Smart CR',
  description: 'Plataforma de nutrición personalizada con IA',
  manifest: '/manifest.json',
  // appleWebApp.capable genera <meta name="apple-mobile-web-app-capable">
  // que Chrome marcó deprecated. Se mantiene por compatibilidad con iOS Safari
  // pero se agrega mobile-web-app-capable manualmente en el <head>.
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Nutri Smart CR',
  },
  icons: {
    icon: '/icons/icon-192x192.png',
    // apple-touch-icon se declara manualmente en <head> abajo
    // para tener control explícito sobre qué archivo usa iOS
  },
};

export const viewport: Viewport = {
  themeColor: '#16a34a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <head>
        {/* Reemplazo del deprecated apple-mobile-web-app-capable */}
        <meta name="mobile-web-app-capable" content="yes" />
        {/* Apple touch icon explícito — Next.js metadata no siempre es suficiente en iOS */}
        <link rel="apple-touch-icon" href="/icons/icon-512x512.png" />
      </head>
      <body className="antialiased font-sans">
        {children}
        <ServiceWorkerUpdater />
      </body>
    </html>
  );
}
