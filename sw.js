/* 预习教练 · Service Worker：离线可用 */
const CACHE = 'preview-coach-v1';
const ASSETS = [
  './', './index.html',
  './assets/style.css',
  './assets/courses.js', './assets/term.js', './assets/timetable.js', './assets/bridge.js',
  './assets/tracks.js', './assets/store.js', './assets/tasks.js',
  './assets/review.js', './assets/coach.js', './assets/reader.js', './assets/flow.js', './assets/app.js',
  './assets/icon-192.png', './assets/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (req.url.indexOf('/.netlify/functions/') >= 0) return;   // 同步接口不缓存
  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});