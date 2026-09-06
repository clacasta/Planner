export function registerServiceWorker(): void {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('Service Worker registrado correctamente con alcance:', reg.scope);
        })
        .catch((err) => {
          console.log('Error al registrar Service Worker:', err);
        });
    });
  }
}
