const CACHE_NAME = "apphorario-v26";
const ASSETS = [
  "./",
  "index.html",
  "styles.css",
  "lib/http.js",
  "js/01-core.js",
  "js/02-events.js",
  "js/03-sii-schedule.js",
  "js/04-grades.js",
  "js/05-sii-text-utils.js",
  "js/06-settings-location.js",
  "js/07-platform-notifications.js",
  "js/08-render.js",
  "js/09-actions-notes.js",
  "js/10-media.js",
  "js/11-notification-runtime.js",
  "js/12-storage-helpers.js",
  "env.js",
  "manifest.webmanifest",
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
