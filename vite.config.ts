import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Um unico worker escrito a mao (src/sw.ts): a Fase 7 coloca o tratador de push no mesmo arquivo.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      // Sem interface: quando ativar a versao nova e decisao de shared/core/pwaUpdate.js (D-14).
      registerType: 'prompt',
      // O registro e feito no codigo do app (plano 05-10), nao por script injetado.
      injectRegister: false,
      devOptions: { enabled: false },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,woff2,svg,png,ico,webmanifest}'],
        // O bundle principal tem 1.816.567 bytes e o padrao de 2 MiB vira erro de build.
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
      manifest: {
        name: 'Coinc',
        short_name: 'Coinc',
        description: 'Finanças do casal, com o Vintém de olho nos seus limites.',
        lang: 'pt-BR',
        dir: 'ltr',
        id: '/',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f5ecdb',
        theme_color: '#f5ecdb',
        categories: ['finance'],
        // Tres entradas separadas: nunca o proposito "any maskable" junto.
        icons: [
          { src: '/icons/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
})
