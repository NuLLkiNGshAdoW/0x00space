const VERSION = "0x00space-pwa-v1";
const SHELL_CACHE = `${VERSION}-shell`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const IMAGE_CACHE = `${VERSION}-images`;
const APP_SHELL = ["/", "/index.html", "/manifest.webmanifest", "/favicon.svg", "/brand-mark.png"];
const CACHEABLE_API = /\/api\/(youtube\/latest|resources|seeds|events)(?:\/|$)/;
const MAX_CACHED_IMAGES = 80;
const MAX_CACHED_API_RESPONSES = 40;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(async (cache) => {
      await cache.addAll(APP_SHELL);
      const response = await cache.match("/index.html");
      if (!response) return;
      const html = await response.text();
      const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^\x22]+)"/g)].map((match) => match[1]);
      await Promise.all(assets.map((asset) => cache.add(asset).catch(() => {})));
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key.startsWith("0x00space-pwa-") && ![SHELL_CACHE, RUNTIME_CACHE, IMAGE_CACHE].includes(key))
        .map((key) => caches.delete(key)),
    )).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then((response) => {
      if (response.ok && url.origin === self.location.origin) {
        const copy = response.clone();
        caches.open(SHELL_CACHE).then((cache) => cache.put("/index.html", copy));
      }
      return response;
    }).catch(async () => (await caches.match("/index.html")) || Response.error()));
    return;
  }

  if (CACHEABLE_API.test(url.pathname)) {
    event.respondWith(networkFirst(request, RUNTIME_CACHE));
    return;
  }

  if (request.destination === "image") {
    event.respondWith(imageFirst(request));
    return;
  }

  if (url.origin === self.location.origin && /\/(assets\/|brand-mark\.png$|favicon\.svg$|manifest\.webmanifest$)/.test(url.pathname)) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
  }
});

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok && response.type !== "opaque") {
      try {
        await cache.put(request, response.clone());
        const keys = await cache.keys();
        await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_CACHED_API_RESPONSES)).map((key) => cache.delete(key)));
      } catch {
        // Keep the successful network response even when storage is full.
      }
    }
    return response;
  } catch {
    return (await cache.match(request)) || Response.error();
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && response.type !== "opaque") {
    try {
      const cache = await caches.open(cacheName);
      await cache.put(request, response.clone());
    } catch {
      // The resource remains usable for this request if it cannot be cached.
    }
  }
  return response;
}

async function imageFirst(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok || response.type === "opaque") {
      try {
        await cache.put(request, response.clone());
        const keys = await cache.keys();
        await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_CACHED_IMAGES)).map((key) => cache.delete(key)));
      } catch {
        // The image still loads from the network if it cannot be cached.
      }
    }
    return response;
  } catch {
    return (await cache.match(request)) || Response.error();
  }
}
