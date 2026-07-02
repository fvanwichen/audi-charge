/* Laadwacht service worker — receives background push and shows the move-the-car alert */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch (_) {}
  const title = data.title || "Verplaats de auto 🚗";
  e.waitUntil(self.registration.showNotification(title, {
    body: data.body || "De Q3 is klaar met laden. Tik de sticker wanneer je 'm verplaatst hebt.",
    tag: "laadwacht-done",
    renotify: true,
    vibrate: [300, 120, 300, 120, 300],
    icon: "./icon-192.png",
    badge: "./icon-192.png",
    requireInteraction: true
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) { if ("focus" in c) return c.focus(); }
    return self.clients.openWindow("./");
  }));
});
