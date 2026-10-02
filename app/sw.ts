/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { NetworkFirst, Serwist, type PrecacheEntry, type SerwistGlobalConfig } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const APP_ROUTE = /^\/(?:$|editor(?:\/|$)|presets(?:\/|$)|changelog(?:\/|$)|offline(?:\/|$))/;

const serwist = new Serwist({
  cacheId: "intaglio",
  precacheEntries: self.__SW_MANIFEST,
  clientsClaim: true,
  skipWaiting: false,
  navigationPreload: true,
  precacheOptions: {
    cleanupOutdatedCaches: true,
    navigateFallback: "/offline",
    navigateFallbackAllowlist: [APP_ROUTE],
  },
  runtimeCaching: [
    {
      matcher: ({ request, url }) => request.mode === "navigate" && url.origin === self.location.origin && APP_ROUTE.test(url.pathname),
      handler: new NetworkFirst({ cacheName: "intaglio-pages", networkTimeoutSeconds: 3 }),
    },
  ],
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => /^ormond-/.test(key)).map((key) => caches.delete(key)))));
});

serwist.addEventListeners();
