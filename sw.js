/**
 * 골프 날씨 — 서비스 워커
 *
 * 하는 일
 *  · 앱 껍데기(HTML/아이콘)를 캐시해 오프라인에서도 화면이 뜨게 한다.
 *  · 홈 화면 설치(PWA) 요건을 충족시킨다.
 *
 * 정책
 *  · 같은 도메인 파일: 네트워크 우선 → 실패하면 캐시 (업데이트가 바로 반영됨)
 *  · 외부 요청(기상청·Open-Meteo·Worker): 손대지 않는다. 날씨는 항상 최신이어야 한다.
 *
 * 앱을 수정한 뒤에는 아래 CACHE 버전을 올려야 기존 캐시가 정리된다.
 */
const CACHE = "golf-weather-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable.png",
  "./apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      // 일부 파일이 없어도 설치가 실패하지 않도록 개별 처리
      .then((c) => Promise.all(ASSETS.map((u) => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  let url;
  try { url = new URL(req.url); } catch { return; }
  // 외부 도메인(날씨 API 등)은 서비스 워커가 개입하지 않는다
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((hit) => hit || caches.match("./index.html"))
      )
  );
});
