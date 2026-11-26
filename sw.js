// Service worker : permet d'ouvrir le site sans connexion.
const V = "artisanat-v3";
const PHOTOS = "photos-v1";
const BASE = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(BASE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== V && k !== PHOTOS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);

  // Photos Cloudinary : cache d'abord
  if (u.hostname === "res.cloudinary.com") {
    e.respondWith(
      caches.open(PHOTOS).then(async (c) => {
        const hit = await c.match(r);
        if (hit) return hit;
        try {
          const net = await fetch(r);
          if (net.ok || net.type === "opaque") c.put(r, net.clone());
          return net;
        } catch { return Response.error(); }
      })
    );
    return;
  }

  // Bibliothèques PDF : cache d'abord
  if (u.hostname === "cdnjs.cloudflare.com") {
    e.respondWith(
      caches.open(PHOTOS).then(async (c) => {
        const hit = await c.match(r);
        if (hit) return hit;
        try { const net = await fetch(r); if (net.ok) c.put(r, net.clone()); return net; }
        catch { return Response.error(); }
      })
    );
    return;
  }

  // Firebase et autres services : gérés par leurs propres bibliothèques
  if (u.origin !== location.origin) return;

  // Le site : réseau d'abord (mises à jour), copie locale si hors connexion
  e.respondWith(
    fetch(r)
      .then((net) => { const copie = net.clone(); caches.open(V).then((c) => c.put(r, copie)); return net; })
      .catch(() => caches.match(r).then((h) => h || caches.match("./index.html")))
  );
});
