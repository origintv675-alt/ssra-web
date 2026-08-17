/* SSRA daily sky-alert worker. Messaging only — it never caches the app. */
self.addEventListener("push", (event) => {
  let payload = { title: "SSRA sky alert", body: "Something is happening in the sky tonight.", url: "/sky-events" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    if (event.data) payload.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/favicon.png",
      badge: "/favicon.png",
      tag: payload.tag || "ssra-sky-daily",
      data: { url: payload.url || "/sky-events" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/sky-events";
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clients) {
        if (client.url.includes(target)) return client.focus();
      }
      return self.clients.openWindow(target);
    })(),
  );
});