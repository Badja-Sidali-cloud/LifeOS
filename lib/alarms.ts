// ── LifeOS Alarm System ───────────────────────────────────────────────────────
// Alarms are stored in a separate IndexedDB ('lifeos-alarms').
// The service worker reads them and fires notifications.
// The app also checks every minute when open (belt-and-suspenders).

export interface Alarm {
  id: string;
  title: string;
  body: string;
  timeHH: string;   // "06:30"
  days: number[];   // 0=Mon … 6=Sun, empty = every day
  enabled: boolean;
  url: string;
  fireAt?: number;  // computed next fire timestamp
  fired?: boolean;
}

const DB_NAME  = 'lifeos-alarms';
const DB_STORE = 'alarms';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = e => {
      (e.target as IDBOpenDBRequest).result.createObjectStore(DB_STORE, { keyPath: 'id' });
    };
    req.onsuccess = e => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror   = e => reject((e.target as IDBOpenDBRequest).error);
  });
}

export async function getAlarms(): Promise<Alarm[]> {
  const db    = await openDb();
  const tx    = db.transaction(DB_STORE, 'readonly');
  const store = tx.objectStore(DB_STORE);
  return new Promise((res, rej) => {
    const req = store.getAll();
    req.onsuccess = () => res(req.result as Alarm[]);
    req.onerror   = () => rej(req.error);
  });
}

export async function saveAlarm(alarm: Alarm): Promise<void> {
  const db    = await openDb();
  const tx    = db.transaction(DB_STORE, 'readwrite');
  const store = tx.objectStore(DB_STORE);
  // Compute next fireAt
  const scheduled = { ...alarm, fireAt: nextFireTime(alarm), fired: false };
  store.put(scheduled);
}

export async function deleteAlarm(id: string): Promise<void> {
  const db    = await openDb();
  const tx    = db.transaction(DB_STORE, 'readwrite');
  tx.objectStore(DB_STORE).delete(id);
}

export async function toggleAlarm(id: string, enabled: boolean): Promise<void> {
  const db    = await openDb();
  const tx    = db.transaction(DB_STORE, 'readwrite');
  const store = tx.objectStore(DB_STORE);
  const alarm = await new Promise<Alarm>((res, rej) => {
    const req = store.get(id);
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  });
  if (alarm) {
    store.put({ ...alarm, enabled, fireAt: enabled ? nextFireTime(alarm) : alarm.fireAt, fired: false });
  }
}

// Compute the next timestamp this alarm should fire
export function nextFireTime(alarm: Alarm): number {
  const [h, m] = alarm.timeHH.split(':').map(Number);
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);

  // 0=Sun in JS, convert to 0=Mon
  const jsToMon = (d: number) => (d + 6) % 7;
  const todayDow = jsToMon(now.getDay());

  // Find next matching day
  for (let offset = 0; offset <= 7; offset++) {
    const candidate = new Date(today.getTime() + offset * 86400000);
    const candidateDow = jsToMon(candidate.getDay());
    const dayMatches = alarm.days.length === 0 || alarm.days.includes(candidateDow);
    if (dayMatches && candidate.getTime() > now.getTime()) {
      return candidate.getTime();
    }
  }
  return today.getTime() + 86400000; // fallback: tomorrow
}

// Request notification permission
export async function requestPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

// Reschedule all alarms (call after midnight or on app open)
export async function rescheduleAll(): Promise<void> {
  const alarms = await getAlarms();
  const db     = await openDb();
  const tx     = db.transaction(DB_STORE, 'readwrite');
  const store  = tx.objectStore(DB_STORE);
  for (const alarm of alarms) {
    if (alarm.enabled) {
      store.put({ ...alarm, fireAt: nextFireTime(alarm), fired: false });
    }
  }
}

// Ping the service worker to check alarms now
export function pingServiceWorker(): void {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'CHECK_ALARMS' });
  }
}

// In-app fallback: check alarms every minute when app is open
let _intervalId: ReturnType<typeof setInterval> | null = null;
export function startAlarmWatcher(): void {
  if (_intervalId) return;
  _intervalId = setInterval(async () => {
    const alarms = await getAlarms();
    const now    = Date.now();
    for (const alarm of alarms) {
      if (!alarm.enabled || alarm.fired) continue;
      if (alarm.fireAt && alarm.fireAt <= now && alarm.fireAt >= now - 60000) {
        // Fire in-app notification
        if (Notification.permission === 'granted') {
          new Notification(alarm.title, {
            body: alarm.body,
            icon: '/icon.svg',
          });
        }
        // Mark fired in DB
        const db    = await openDb();
        const tx    = db.transaction(DB_STORE, 'readwrite');
        tx.objectStore(DB_STORE).put({ ...alarm, fired: true });
        // Schedule next occurrence
        setTimeout(async () => {
          const db2 = await openDb();
          const tx2 = db2.transaction(DB_STORE, 'readwrite');
          tx2.objectStore(DB_STORE).put({ ...alarm, fired: false, fireAt: nextFireTime(alarm) });
        }, 61000);
      }
    }
    pingServiceWorker();
  }, 60000);
}

export function stopAlarmWatcher(): void {
  if (_intervalId) { clearInterval(_intervalId); _intervalId = null; }
}

// Default alarms for Sidali's schedule
export const DEFAULT_ALARMS: Alarm[] = [
  {
    id: 'leave-home',
    title: '🎒 Leave in 15 min',
    body: 'Pack bag — train at 07:00. Open LifeOS to check today.',
    timeHH: '06:40',
    days: [0, 1, 2, 3], // Mon–Thu
    enabled: false,
    url: '/today',
  },
  {
    id: 'catch-train-home',
    title: '🚂 Train home in 15 min',
    body: 'Head to station — train at 17:00.',
    timeHH: '16:45',
    days: [0, 1, 2, 3], // Mon–Thu
    enabled: false,
    url: '/today',
  },
  {
    id: 'evening-study',
    title: '📚 Evening study time',
    body: "Isha is done. Time to study or do Web Dev.",
    timeHH: '21:30',
    days: [], // every day
    enabled: false,
    url: '/study',
  },
  {
    id: 'morning-study-weekend',
    title: '☀️ Morning study block',
    body: 'Free day — start your first study block now.',
    timeHH: '08:00',
    days: [4, 5, 6], // Fri, Sat, Sun
    enabled: false,
    url: '/study',
  },
];
