/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

/*
 * Toute navigation est servie par la page précachée.
 *
 * Sans cette route, seule l'adresse « / » fonctionnait hors ligne : le
 * précache contient index.html, mais rien ne reliait /progress ou /group à ce
 * fichier. Recharger l'app depuis un de ces écrans sans réseau affichait la
 * page d'erreur du navigateur, alors que tout était sur l'appareil. Les routes
 * de l'app sont résolues côté client : elles pointent toutes vers index.html.
 */
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), {
    // Les fonctions serveur ne sont pas des pages de l'app.
    denylist: [/^\/api\//],
  })
);

/*
 * Les cartes ne sont pas précachées : elles sont immuables et trop lourdes
 * pour être rechargées à chaque déploiement. Première consultation = mise en
 * cache, ensuite elles sortent du cache et fonctionnent hors ligne. Les
 * portraits de l'event suivent la même règle, pour la même raison.
 *
 * Le « v2 » du nom est là parce que les portraits, eux, n'étaient pas
 * immuables : l'event a été agrandi en cours de route et quatorze photos ont
 * été recadrées à la même adresse. Avec CacheFirst, qui les avait déjà
 * ouvertes gardait l'ancienne version quatre-vingt-dix jours. Changer de nom
 * de cache est la seule façon de repartir proprement.
 */
registerRoute(
  ({ url, request }) =>
    request.destination === 'image' &&
    (url.pathname.startsWith('/cards/') || url.pathname.startsWith('/faceid/')),
  new CacheFirst({
    cacheName: 'card-images-v2',
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
      // L'ancien cache d'images, remplacé par card-images-v2 : il contient des
      // portraits d'avant le recadrage.
      await caches.delete('card-images');
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
  /** Icône envoyée par le serveur, quand la notif n'est pas une notif ordinaire. */
  icon?: string;
}

/*
 * `renotify` a disparu du type `NotificationOptions` de TypeScript, mais les
 * navigateurs l'honorent toujours — Chrome et Android en particulier, où
 * vivent la quasi-totalité des installations. On étend le type plutôt que de
 * désactiver le contrôle sur tout l'objet.
 */
type OptionsNotif = NotificationOptions & { renotify?: boolean };

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
      // Sans icône envoyée, celle de l'app. L'event envoie la sienne : le
      // même logo, en vert.
      icon: payload.icon || '/icon-192.png',
      badge: payload.icon || '/icon-192.png',
      tag: payload.tag || 'calicrew',
      /*
       * Réalerter à chaque remplacement.
       *
       * Une notification qui porte le même `tag` qu'une notification déjà
       * posée la remplace — c'est voulu, on ne veut pas trois défis
       * surprises empilés dont deux sont périmés. Mais sans `renotify`, ce
       * remplacement est *silencieux* : ni son, ni vibration, ni bandeau.
       *
       * C'est ce qui faisait que certains ne recevaient qu'un seul défi
       * surprise par jour alors qu'il en part trois. Ceux qui vidaient leur
       * volet de notifications les recevaient tous, les autres un seul — la
       * deuxième et la troisième remplaçaient la première sans un bruit. Et
       * le lendemain, une notification de la veille jamais balayée avalait
       * encore la première de la journée.
       *
       * Vaut pour toutes les familles : créatine, pas, défi du jour,
       * ambiance et event ont chacune une étiquette fixe elles aussi.
       */
      renotify: true,
      data: { url: payload.url || '/' },
    } as OptionsNotif)
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
