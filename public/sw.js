// LifeOS Service Worker — offline + notifications
const CACHE = 'lifeos-v2';

const PRECACHE = ['/', '/today', '/study', '/habits', '/focus'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network first, fallback to cache
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok && e.request.mode === 'navigate') {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// ── Alarm system ─────────────────────────────────────────────────────────────
// Alarms are stored in IndexedDB by the app.
// Every time the SW activates or gets a message, it checks for due alarms.

const DB_NAME  = 'lifeos-alarms';
const DB_STORE = 'alarms';

function openAlarmDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore(DB_STORE, { keyPath: 'id' });
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

async function checkAlarms() {
  try {
    const db    = await openAlarmDb();
    const tx    = db.transaction(DB_STORE, 'readwrite');
    const store = tx.objectStore(DB_STORE);
    const all   = await new Promise((res, rej) => {
      const req = store.getAll();
      req.onsuccess = () => res(req.result);
      req.onerror   = () => rej(req.error);
    });

    const now = Date.now();
    for (const alarm of all) {
      // Fire if within the last 2 minutes (to handle SW wake delay)
      if (alarm.fireAt <= now && alarm.fireAt >= now - 2 * 60 * 1000 && !alarm.fired) {
        await self.registration.showNotification(alarm.title, {
          body: alarm.body,
          icon: '/icon.svg',
          badge: '/icon-dark-32x32.png',
          tag: alarm.id,
          renotify: true,
          vibrate: [200, 100, 200],
          data: { url: alarm.url || '/today' },
        });
        // Mark fired
        store.put({ ...alarm, fired: true });
      }
    }
  } catch (e) {
    console.error('[SW] Alarm check failed:', e);
  }
}

// Listen for messages from the app
self.addEventListener('message', (e) => {
  if (e.data?.type === 'CHECK_ALARMS') {
    checkAlarms();
  }
});

// Open the app when notification is tapped
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url || '/today';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      return clients.openWindow(url);
    })
  );
});
