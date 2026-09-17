/**
 * Registro del Service Worker.
 *
 * IMPORTANTE: el SW se publica junto al index, en la raíz del despliegue
 * (por ejemplo /Planner/sw.js en GitHub Pages). Registrarlo con la ruta
 * absoluta "/sw.js" apunta a la raíz del dominio y devuelve 404, dejando la
 * PWA sin modo offline. Por eso resolvemos siempre contra `document.baseURI`
 * (que respeta el `base` de Vite) y declaramos el `scope` correspondiente.
 */
export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;

  window.addEventListener('load', () => {
    const scope = import.meta.env.BASE_URL || './';
    const swUrl = new URL('sw.js', document.baseURI).href;

    navigator.serviceWorker
      .register(swUrl, { scope })
      .then((reg) => {
        // Si ya hay una versión nueva esperando (pestaña abierta desde antes),
        // la activamos para no quedarnos con caché vieja.
        if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });

        reg.addEventListener('updatefound', () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      })
      .catch((err) => {
        console.warn('No se pudo registrar el Service Worker:', err);
      });
  });
}
