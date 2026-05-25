'use client';

import { useEffect } from 'react';

/**
 * Registra el service worker y fuerza la activación inmediata
 * cuando hay una nueva versión esperando.
 *
 * Al detectar un SW en estado "waiting", le enviamos SKIP_WAITING
 * para que tome control sin esperar a cerrar pestañas, y luego
 * recargamos la página para que cargue los assets nuevos.
 *
 * Esto garantiza que siempre se sirva el sw.js actualizado
 * (con el CACHE_NAME correcto y las exclusiones de /auth/).
 */
export default function ServiceWorkerUpdater() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // Si ya hay un SW esperando (instalado pero no activo), activarlo ya
      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      // Cuando llegue una nueva versión mientras la página está abierta
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Nueva versión lista → activar y recargar
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    }).catch(() => {
      // Registro del SW falló (modo privado, HTTP, etc.) — ignorar silenciosamente
    });

    // Recargar cuando el SW activo cambia (resultado del SKIP_WAITING anterior)
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }, []);

  return null;
}
