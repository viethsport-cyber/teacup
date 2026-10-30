// Service Worker: macht die App offline nutzbar.
// Wichtig: Der Lernstand liegt NICHT im Cache, sondern im Gerätespeicher (localStorage).
// Ein Update tauscht nur die Programmdateien aus, die Daten bleiben unberührt.
const VERSION = '2.0.8-beta.1';
const CACHE = 'tcbeta-' + VERSION;
// Große Zusatzdateien (Fotoerkennung) werden erst bei Bedarf geladen und dann dauerhaft gespeichert.
const VENDOR = 'teacup-vendor-1'; // geteilt mit der normalen App
const FILES = [
  './', './index.html', './styles.css', './app.js', './manifest.webmanifest',
  '../icons/icon.svg', '../fonts/nunito-latin-wght-normal.woff2', '../fonts/nunito-latin-ext-wght-normal.woff2', '../icons/icon-192.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('tcbeta-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (new URL(req.url).pathname.includes('/vendor/')) {
    e.respondWith(caches.open(VENDOR).then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }))));
    return;
  }
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).catch(() => caches.match('./index.html')))
  );
});
