/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  ({ url }) => url.origin === 'https://firestore.googleapis.com',
  new NetworkFirst({
    cacheName: 'firestore-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 })],
  })
);

self.skipWaiting();
self.addEventListener('activate', () => self.clients.claim());

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
