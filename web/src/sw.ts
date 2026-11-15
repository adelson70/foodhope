/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  matchPrecache,
  precacheAndRoute,
} from 'workbox-precaching'
import {
  NavigationRoute,
  registerRoute,
  setCatchHandler,
} from 'workbox-routing'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheFirst } from 'workbox-strategies'

declare let self: ServiceWorkerGlobalScope & typeof globalThis

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

self.skipWaiting()
clientsClaim()

registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), {
    denylist: [/^\/api/],
  }),
)

// Imagens servidas pela API (/public/...): cache local para uso offline.
registerRoute(
  ({ request, url }) =>
    request.destination === 'image' && url.pathname.startsWith('/public/'),
  new CacheFirst({
    cacheName: 'foodhope-imagens',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 60 * 60 * 24 * 30,
        purgeOnQuotaError: true,
      }),
    ],
  }),
)

setCatchHandler(async ({ request }) => {
  if (request.destination === 'document') {
    return (await matchPrecache('/index.html')) ?? Response.error()
  }
  return Response.error()
})

// Push do Firebase (FCM) com mensagem só de "data": a API manda título, corpo e
// url em payload.data. O iOS exige mostrar uma notificação a cada push recebido.
type DadosPush = {
  tipo?: string
  pedidoId?: string
  numero?: string
  titulo?: string
  corpo?: string
  url?: string
}

self.addEventListener('push', (event) => {
  let dados: DadosPush
  try {
    const json = event.data?.json() as { data?: DadosPush } & DadosPush
    dados = json?.data ?? json ?? {}
  } catch {
    dados = {}
  }

  // vibrate/renotify/requireInteraction: o Android trata como alerta e mostra
  // flutuando. O badge precisa ser monocromático com fundo transparente (o Android
  // só usa o alfa; ícone colorido opaco vira um quadrado branco).
  const opcoes: NotificationOptions & {
    vibrate?: number[]
    renotify?: boolean
  } = {
    body: dados.corpo || 'Seu pedido está pronto para retirada.',
    icon: '/icon-192.png',
    badge: '/badge-96.png',
    tag: `pedido-${dados.pedidoId || 'pronto'}`,
    renotify: true,
    requireInteraction: true,
    vibrate: [300, 120, 300, 120, 300],
    data: { url: dados.url || '/pedidos' },
  }

  event.waitUntil(
    self.registration.showNotification(dados.titulo || 'Food Hope', opcoes),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const destino = new URL(
    (event.notification.data as { url?: string } | null)?.url || '/pedidos',
    self.location.origin,
  ).href

  event.waitUntil(
    (async () => {
      const janelas = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      const janela = janelas[0]
      if (janela) {
        await janela.focus()
        if (janela.url !== destino) await janela.navigate(destino).catch(() => {})
        return
      }
      await self.clients.openWindow(destino)
    })(),
  )
})
