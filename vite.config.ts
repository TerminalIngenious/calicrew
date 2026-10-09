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
      manifest: {
        name: 'CaliCrew',
        short_name: 'CaliCrew',
        description: 'Track tes perfs, challenge tes potes',
        start_url: '/',
        display: 'standalone',
        background_color: '#0a0a1a',
        theme_color: '#ff6b35',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
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
