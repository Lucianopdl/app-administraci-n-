// Cache del "shell" de la app. Los datos siempre van a Supabase (no se cachean).
const CACHE = 'finanzas-v3';
const SHELL = ['./', 'index.html', 'styles.css', 'app.js', 'charts3d.js', 'config.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.58.0/dist/umd/supabase.min.js'];

self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', ev => {
  ev.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// Red primero (para recibir actualizaciones), cache si no hay conexión.
self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET' || /supabase\.co/.test(req.url)) return;
  ev.respondWith(fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req)));
});

// Notificaciones push de vencimientos (las manda la función "recordatorios" de Supabase).
self.addEventListener('push', ev => {
  let d = {};
  try { d = ev.data ? ev.data.json() : {}; } catch { d = { body: ev.data && ev.data.text() }; }
  ev.waitUntil(self.registration.showNotification(d.title || 'Mis Finanzas', {
    body: d.body || 'Tenés un vencimiento próximo.', tag: d.tag, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png'
  }));
});
self.addEventListener('notificationclick', ev => {
  ev.notification.close();
  ev.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    const c = cs.find(c => 'focus' in c);
    return c ? c.focus() : self.clients.openWindow('./');
  }));
});
