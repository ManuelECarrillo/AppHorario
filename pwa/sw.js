const CACHE_NAME = "apphorario-v22";
const ASSETS = [
  "./",
  "index.html",
  "styles.css",
  "app.js",
  "manifest.webmanifest",
  "assets/icon.svg",
  "assets/icon-192.png",
  "assets/icon-512.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const shouldOpenQuickTask = event.action === "quickTask" || data.quickTask;
  const url = shouldOpenQuickTask && data.classId
    ? `./index.html?quickTask=${encodeURIComponent(data.classId)}`
    : "./index.html";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const visibleClient = clientList.find((client) => "focus" in client);
      if (visibleClient) {
        visibleClient.focus();
        if ("navigate" in visibleClient) return visibleClient.navigate(url);
        return undefined;
      }

      if (clients.openWindow) return clients.openWindow(url);
      return undefined;
    })
  );
});
