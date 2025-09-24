self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open("subkeep-cache").then((cache) => {
      return cache.addAll([
        "./",
        "./index.html",
        "./style.css",
        "./script.js",
        "./subkeep-logo.png",
        "./add.html",
        "./history.html",
        "./index2.html",
        "./achievements.html"
      ]);
    })
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});