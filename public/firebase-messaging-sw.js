// Service worker de notificaciones push (Firebase Cloud Messaging).
// El servidor manda mensajes "solo datos": { titulo, cuerpo, url }.

const ES_IOS = /iPad|iPhone|iPod/.test(self.navigator.userAgent);

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let carga = {};
  try {
    carga = event.data ? event.data.json() : {};
  } catch (_) {
    carga = {};
  }
  // Según el origen, FCM entrega los campos en `data` o en `notification`.
  const d = carga.data || carga.notification || carga;
  const titulo = d.titulo || d.title || 'Sofi y Juan';
  const cuerpo = d.cuerpo || d.body || '';
  const url = d.url || '/';

  event.waitUntil(
    (async () => {
      const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const visible = ventanas.find((c) => c.visibilityState === 'visible');
      if (visible) visible.postMessage({ tipo: 'push', titulo, cuerpo, url });
      // iOS exige mostrar siempre la notificación; en el resto, con la app abierta basta el aviso interno.
      if (visible && !ES_IOS) return;
      await self.registration.showNotification(titulo, {
        body: cuerpo,
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-96.png',
        tag: 'cola',
        renotify: true,
        data: { url },
      });
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destino = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;
  event.waitUntil(
    (async () => {
      const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const c of ventanas) {
        if ('focus' in c) {
          await c.focus();
          if ('navigate' in c) await c.navigate(destino).catch(() => {});
          return;
        }
      }
      await self.clients.openWindow(destino);
    })(),
  );
});
