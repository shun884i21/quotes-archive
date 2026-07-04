// Service Worker — ネットワーク優先（最新の格言を取りに行き、失敗時はキャッシュ）
const CACHE = "quote-archive-v8";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./quotes.json",
  "./manifest.json",
  "./icon.svg",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // 外部リソースは触らない
  url.search = ""; // ?_=タイムスタンプ を除いた正規化キーで保存/照合（キャッシュ肥大と照合ミスを防ぐ）
  const cacheKey = url.href;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(cacheKey, copy)).catch(() => {});
        return res;
      })
      .catch(() =>
        caches.match(cacheKey).then((r) => {
          if (r) return r;
          // ページ遷移だけHTMLへフォールバック（JSON要求にHTMLを返さない）
          if (e.request.mode === "navigate") return caches.match("./index.html");
          return Response.error();
        })
      )
  );
});
