// ---- sw.js （全差し替え）----
// 端末更新を早める
self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open("subkeep-cache-v2").then((cache) =>
      cache.addAll([
        "./",
        "./index.html",
        "./style.css",
        "./script.js",
        "./subkeep-logo.png",
        "./add.html",
        "./history.html",
        "./index2.html",
        "./achievements.html",
        "./manifest.json"
      ])
    )
  );
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== "subkeep-cache-v2").map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  // ナビゲーションはネット優先＋フォールバック
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).catch(() => caches.match("./index.html"))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});

// ページ側からのメッセージで通知（簡易版）
self.addEventListener("message", (e) => {
  const { type, title, options } = e.data || {};
  if (type === "LOCAL_NOTIFY") {
    self.registration.showNotification(title || "Subkeep", options || {});
  }
});
