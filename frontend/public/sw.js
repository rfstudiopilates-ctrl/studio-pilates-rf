const CACHE_VERSION = 'v5';
const STATIC_CACHE = `sprf-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `sprf-runtime-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  '/offline.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/pwa-icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
];

function isStaticAsset(pathname) {
  return /\.(js|css|png|jpg|jpeg|svg|webp|woff2?|webmanifest)$/i.test(pathname);
}

function absoluteAsset(path) {
  try {
    return new URL(path, self.location.origin).href;
  } catch {
    return path;
  }
}

function contentType(response) {
  return (response.headers.get('content-type') || '').toLowerCase();
}

function isValidHtmlResponse(response) {
  return response.ok && contentType(response).includes('text/html');
}

function isValidAssetResponse(response, pathname) {
  if (!response.ok) {
    return false;
  }

  const type = contentType(response);

  if (pathname.endsWith('.css')) {
    return type.includes('text/css');
  }

  if (pathname.endsWith('.js')) {
    return type.includes('javascript') || type.includes('ecmascript');
  }

  // No cachear HTML (p.ej. fallback SPA) como si fuera un asset.
  if (type.includes('text/html')) {
    return false;
  }

  return true;
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);

    if (isValidHtmlResponse(response)) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }

    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    return caches.match('/offline.html');
  }
}

async function networkFirstAsset(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const pathname = new URL(request.url).pathname;

  try {
    const response = await fetch(request);

    if (isValidAssetResponse(response, pathname)) {
      cache.put(request, response.clone());
    }

    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached && isValidAssetResponse(cached, pathname)) {
      return cached;
    }

    // Nunca devolver offline.html (HTML) como CSS/JS: deja la UI sin estilos.
    return Response.error();
  }
}

self.addEventListener('install', (event) => {
  // No llamar skipWaiting acá: en updates espera confirmación del usuario.
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith('/api')) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isStaticAsset(url.pathname)) {
    event.respondWith(networkFirstAsset(request));
  }
});

self.addEventListener('push', (event) => {
  let data = {
    title: 'Studio Pilates RF',
    body: 'Tenés una nueva notificación',
    url: '/',
    eventType: 'general',
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  const title = data.title || 'Studio Pilates RF';
  const options = {
    body: data.body || 'Tenés una nueva notificación',
    icon: absoluteAsset('/icons/icon-192.png'),
    badge: absoluteAsset('/icons/icon-192.png'),
    data: {
      url: data.url || '/',
      eventType: data.eventType || 'general',
    },
    tag: data.eventType ? `sprf-${data.eventType}` : 'sprf-notification',
    renotify: true,
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  let targetUrl = event.notification.data?.url || '/';

  try {
    if (/^https?:\/\//i.test(targetUrl)) {
      const parsed = new URL(targetUrl);
      if (parsed.origin === self.location.origin) {
        targetUrl = `${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
    }
  } catch {
    targetUrl = '/';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }

      return undefined;
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data?.type === 'CLEAR_CACHES') {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
    );
  }
});
