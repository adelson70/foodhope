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

setCatchHandler(async ({ request }) => {
  if (request.destination === 'document') {
    return (await matchPrecache('/index.html')) ?? Response.error()
  }
  return Response.error()
})
