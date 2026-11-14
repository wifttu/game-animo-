// 업데이트가 바로 반영되도록, 같은 사이트의 파일은 항상 서버에 최신 여부를 확인한 뒤 사용한다.
// (브라우저가 예전 스크립트를 몇 분간 그대로 쓰는 것을 막는다. 오프라인 저장은 하지 않는다.)
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(fetch(r, { cache: 'no-cache' }).catch(() => fetch(r)));
});
