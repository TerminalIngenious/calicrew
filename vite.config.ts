import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'],
      /*
       * Un seul manifeste, celui-ci.
       *
       * Il en traînait un deuxième écrit à la main dans public/, et c'était lui
       * que index.html déclarait : les réglages ajoutés ici n'arrivaient jamais
       * jusqu'au téléphone. Le lien est désormais injecté au build, il n'y a
       * plus qu'une source.
       */
      manifest: {
        // Identité stable de l'app : sans `id`, changer `start_url` un jour
        // ferait réinstaller une deuxième CaliCrew à côté de la première.
        id: '/',
        name: 'CaliCrew',
        short_name: 'CaliCrew',
        description: 'Track tes perfs, challenge tes potes',
        lang: 'fr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        categories: ['fitness', 'health', 'sports'],
        background_color: '#0a0a1a',
        // La même couleur que la balise theme-color de index.html. Elles
        // divergeaient, et c'est cette valeur-là qui peint la barre de titre
        // de la fenêtre une fois l'app installée sur ordinateur : en orange,
        // elle jurait avec tout le reste.
        theme_color: '#0a0a1a',
        shortcuts: [
          { name: 'Nouvelle séance', short_name: 'Séance', url: '/session/new' },
          { name: 'Ma progression', short_name: 'Progrès', url: '/progress' },
        ],
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          // Android découpe l'icône à la forme du thème. L'icône normale va
          // bord à bord : sous un masque rond, la barre de traction et les
          // mains du bonhomme étaient rognées. Celle-ci garde le dessin dans
          // les 80 % centraux et porte un fond plein.
          {
            src: '/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Les images de cartes pèsent 10,8 Mo sur 12,2. Or un nouveau service
        // worker doit télécharger tout son précache avant de pouvoir
        // s'activer : à ce poids-là, sur un téléphone, la mise à jour cale et
        // l'ancienne version continue d'être servie indéfiniment. Les cartes
        // sont donc mises en cache à l'affichage (CacheFirst dans sw.ts), ce
        // qui ramène le précache à l'app elle-même.
        globIgnores: ['**/cards/**'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    }),
  ],
})
