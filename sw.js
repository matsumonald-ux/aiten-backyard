// ============================================
// ネットが無い屋外でも管理画面を開けるように、
// 画面のファイルをスマホの中に保存しておく仕組み（サービスワーカー）。
// ネットに繋がる時は最新の画面を取りに行き、繋がらない時は保存しておいた画面を使う。
// 画面を更新したら CACHE の名前の番号を1つ上げると、古い保存が消える。
// ============================================
const CACHE = "aiten-backyard-v5";
const FILES = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];
const NET_MACHI_MS = 3000; // 電波が弱い時に待ちすぎないよう、この時間で保存版に切り替える

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function netWoMatsu(request) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), NET_MACHI_MS);
    fetch(request).then(
      (res) => { clearTimeout(timer); resolve(res); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  // Googleフォントなど他のサイトのファイルは触らない（ネットが無い時はスマホの標準の字体になる）
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    netWoMatsu(request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(request).then((saved) => saved || caches.match("./index.html"))
      )
  );
});
