/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Les cartes ne sont pas précachées : elles sont immuables et trop lourdes
// pour être rechargées à chaque déploiement. Première consultation = mise en
// cache, ensuite elles sortent du cache et fonctionnent hors ligne.
registerRoute(
  ({ url, request }) => request.destination === 'image' && url.pathname.startsWith('/cards/'),
  new CacheFirst({
    cacheName: 'card-images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 400,
        maxAgeSeconds: 60 * 60 * 24 * 90,
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// Firestore n'est pas mis en cache ici, et ne doit pas l'être.
//
// Ses échanges ne sont pas des requêtes ordinaires : c'est un canal maintenu
// ouvert en long-polling. Une stratégie NetworkFirst attendait le réseau sans
// limite de temps puis resservait une réponse de canal enregistrée plus tôt —
// d'où des chargements tantôt instantanés, tantôt sans fin. Le client Firestore
// a déjà son propre cache persistant, activé dans lib/firebase.ts : c'est lui
// qui fait marcher l'app hors ligne.

// skipWaiting appartient à la phase d'installation : appelé au niveau du
// module, il peut arriver trop tard pour la prise de contrôle.
self.addEventListener('install', () => {
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Les installations déjà déployées portent un cache « firestore-cache »
      // rempli de réponses de canal périmées. cleanupOutdatedCaches() ne touche
      // que les précaches de Workbox, alors on le supprime explicitement :
      // sans ça, le problème survivrait à la mise à jour.
      await caches.delete('firestore-cache');
      await self.clients.claim();
    })()
  );
});

// ── Notifications push ──

interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
}

self.addEventListener('push', (event: PushEvent) => {
  let payload: PushPayload = { title: 'CaliCrew', body: '' };
  try {
    if (event.data) payload = { ...payload, ...(event.data.json() as PushPayload) };
  } catch {
    if (event.data) payload.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: payload.tag || 'calicrew',
      data: { url: payload.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const target = (event.notification.data?.url as string) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
