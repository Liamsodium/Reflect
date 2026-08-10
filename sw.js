/* ─────────────────────────────────────────────────────────────
   Reflect — Service Worker
   กลยุทธ์: NETWORK-FIRST สำหรับไฟล์แอป
     • มีเน็ต  → ดึงไฟล์ใหม่จาก GitHub เสมอ แล้วเก็บสำเนาไว้
     • ไม่มีเน็ต → ใช้สำเนาที่เก็บไว้
   ผลลัพธ์: อัปเดตแอปแล้วผู้ใช้ได้เวอร์ชันใหม่ทันที และยังใช้ offline ได้

   ไฟล์นี้เขียนครั้งเดียว ไม่ต้องแก้อีกเวลาอัปเดตแอป
   ───────────────────────────────────────────────────────────── */

const CACHE = 'reflect-app-v1';
const FONT_CACHE = 'reflect-fonts-v1';

const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-512.png',
];

// ── ติดตั้ง: เก็บสำเนาไฟล์หลักไว้ทันที ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(CORE).catch(() => {
        // ถ้าไฟล์ใดโหลดไม่ได้ ก็ยังติดตั้งต่อได้ ไม่ให้ล้มทั้งหมด
        return Promise.all(CORE.map((u) => cache.add(u).catch(() => null)));
      }))
      .then(() => self.skipWaiting())
  );
});

// ── เปิดใช้งาน: ลบ cache รุ่นเก่า แล้วคุมทุกแท็บทันที ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE && k !== FONT_CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── ให้หน้าเว็บสั่งอัปเดตเองได้ ──
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // สนใจแค่การอ่านข้อมูล (GET) เท่านั้น
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }

  // ─── ฟอนต์จาก Google: cache-first (ไม่เปลี่ยนบ่อย + ทำให้ offline สวย) ───
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.match(req).then((hit) => {
        if (hit) return hit;
        return fetch(req).then((res) => {
          if (res && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(FONT_CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        }).catch(() => hit);
      })
    );
    return;
  }

  // ─── ไฟล์อื่นที่ไม่ใช่ของเรา: ปล่อยผ่าน ไม่ยุ่ง ───
  if (url.origin !== self.location.origin) return;

  // ─── ไฟล์แอปของเรา: NETWORK-FIRST ───
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => {
        // ออฟไลน์ → ใช้สำเนา
        return caches.match(req).then((hit) => {
          if (hit) return hit;
          // ถ้าเป็นการเปิดหน้าเว็บ ให้ตกกลับไปที่ index.html
          if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
            return caches.match('./index.html');
          }
          return new Response('offline', { status: 503, statusText: 'offline' });
        });
      })
  );
});
