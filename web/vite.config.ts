import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const iconAny = {
  src: 'logo.svg',
  sizes: 'any',
  type: 'image/svg+xml',
  purpose: 'any' as const,
}

const iconMaskable = {
  src: 'favicon.svg',
  sizes: 'any',
  type: 'image/svg+xml',
  purpose: 'any maskable' as const,
}

const shortcutIcon = {
  src: 'favicon.svg',
  sizes: 'any',
  type: 'image/svg+xml',
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      devOptions: {
        enabled: false,
      },
      includeAssets: [
        'favicon.svg',
        'logo.svg',
        'icons.svg',
        'og.png',
        'og-share.png',
        'manifest-painel.webmanifest',
      ],
      manifest: {
        id: '/',
        name: 'Food Hope',
        short_name: 'Food Hope',
        description:
          'Cardápio digital Food Hope — escolha, monte o pedido e retire.',
        theme_color: '#C9A227',
        background_color: '#F7F3EB',
        display: 'standalone',
        lang: 'pt-BR',
        start_url: '/?utm_source=pwa',
        scope: '/',
        icons: [iconAny, iconMaskable],
        shortcuts: [
          {
            name: 'Cardápio',
            short_name: 'Cardápio',
            description: 'Ver cardápio',
            url: '/?utm_source=pwa-shortcut',
            icons: [shortcutIcon],
          },
          {
            name: 'Meus pedidos',
            short_name: 'Pedidos',
            description: 'Histórico de pedidos',
            url: '/pedidos?utm_source=pwa-shortcut',
            icons: [shortcutIcon],
          },
          {
            name: 'Carrinho',
            short_name: 'Carrinho',
            description: 'Abrir carrinho',
            url: '/carrinho?utm_source=pwa-shortcut',
            icons: [shortcutIcon],
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
        globPatterns: ['**/*.{js,css,html,ico,svg,png,webp,woff2,webmanifest}'],
        runtimeCaching: [],
      },
    }),
  ],
})
