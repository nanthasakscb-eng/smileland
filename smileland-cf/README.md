# SMILELAND v2 — Cloudflare Workers

แพลตฟอร์มประกาศ **ขาย / ให้เช่า บ้าน ที่ดิน คอนโด ทั่วประเทศ** สร้างตามแผนย้ายระบบ (SMILELAND-Cloudflare-Migration-Plan)

**สแตก:** Hono (SSR + API) · Drizzle ORM · D1 · R2 · Workers KV · Queues + Cron · Turnstile · MapLibre (self-host) · ฟอนต์ Sarabun (self-host)

> โฟลเดอร์นี้เป็นงานใหม่แยกจาก `smileland-app` (ต้นฉบับ Node.js) — ไม่ได้แก้ไขต้นฉบับ

---

## ฟีเจอร์

**หน้าเว็บสาธารณะ**
- หน้าแรก: ค้นหา ซื้อ/เช่า × ประเภท × จังหวัด × คำค้น, ประกาศแนะนำ, ประกาศใหม่, ลิงก์ 77 จังหวัดแยกภาค (ตัวเลขเรนเดอร์ฝั่ง server)
- หน้า landing SEO: `/{sale|rent}/{house|land|condo|property}/{จังหวัด}/{อำเภอ}` เช่น `/sale/land/ubon-ratchathani/warin-chamrap` ครบ 77 จังหวัด 928 อำเภอ/เขต
  - หน้าที่มีประกาศน้อยกว่า `THIN_PAGE_MIN` (3) ใส่ `noindex` และไม่ใส่ใน sitemap อัตโนมัติ
  - title / meta description สร้างจากชื่อพื้นที่จริงของหน้า (ไม่ใช้ template คัดลอก)
- ค้นหาภาษาไทย: ตัดคำด้วย `Intl.Segmenter` ตอนอนุมัติประกาศ เก็บในตาราง `listing_tokens` ค้นแบบ prefix (เช่น "ที่ดินอุบล", "บ้านเดี่ยว", "ใกล้ม.อุบล")
- รายละเอียดประกาศ: แกลเลอรี + lightbox, ข้อมูลแยกตามประเภท, ราคาต่อ ตร.ว./ตร.ม., แผนที่, จดหมายเหตุทรัพย์ (ประวัติราคา/สถานะ แก้ย้อนหลังไม่ได้), ฟอร์มผู้สนใจ, แชร์ LINE/Facebook, JSON-LD `RealEstateListing`
- ลงประกาศฟรี: ฟอร์ม 5 ขั้น ฟิลด์เปลี่ยนตามประเภท/ขาย-เช่า, เลือก จังหวัด → อำเภอ → ตำบล, ปักหมุดแผนที่, อัปโหลดรูปสูงสุด 12 รูป (**ย่อรูปฝั่ง browser เป็น 400/800/1600px WebP** → ไม่มีค่า Cloudflare Images)
- ตรวจสถานะด้วยเลขอ้างอิง + เบอร์โทร, ลิงก์จัดการประกาศลับ (ปรับราคา / ปิดการขาย / ต่ออายุ / ดูผู้สนใจ)
- ฝากขาย/ฝากเช่า, เครื่องมือคำนวณ (แปลงไร่-งาน-ตร.ว., ค่างวด, ค่าโอน), นโยบายความเป็นส่วนตัว (PDPA), ข้อกำหนด
- sitemap index + sitemap แยกจังหวัด (Cron → Queue → R2), robots.txt, canonical, Open Graph

**ระบบหลังบ้าน `/admin`**
- เข้าสู่ระบบ (PBKDF2 + session ใน KV + Turnstile + rate limit), บังคับเปลี่ยนรหัสครั้งแรก
- คิวรอตรวจสอบ, อนุมัติ/ไม่อนุมัติ (พร้อมเหตุผล), ตั้งประกาศแนะนำ, ปิดการขาย, แก้ราคา
- ผู้สนใจ/ขอฝากขาย พร้อมสถานะติดตาม, ตั้งค่าเว็บไซต์ (เบอร์/LINE/อีเมล/ข้อมูลนโยบาย), จัดการผู้ดูแล, สร้างดัชนีค้นหาใหม่

**ความปลอดภัย / ข้อมูลส่วนบุคคล**
- เบอร์โทร อีเมล เลขที่โฉนดของผู้ลงประกาศ **ไม่แสดงบนหน้าเว็บสาธารณะ** — ผู้สนใจติดต่อผ่านแบบฟอร์ม
- Turnstile เฉพาะตอนส่งฟอร์ม (ไม่บล็อกทั้งเว็บ → Googlebot เข้าได้), rate limit ด้วย KV, ตรวจ Origin + CSRF token, CSP, ไฟล์รูปตรวจ magic bytes

---

## Deploy บน Windows (ดับเบิลคลิก)

- **`deploy.bat`** — อัปเดตเว็บ: รัน migration ที่ยังไม่เคยรัน → อัปเดตประกาศตัวอย่าง (ถ้ามีชุดใหม่) → `wrangler deploy`
  ไม่แตะโดเมน (`SITE_URL`), รหัสแอดมิน, คีย์ Turnstile หรือคีย์อีเมลที่ตั้งไว้ · ถ้ายังไม่เคย deploy จะเข้าขั้นตอนติดตั้งครั้งแรกให้เอง
- **`set-keys.bat`** — ตั้งคีย์ลับ: `RESEND_API_KEY` (ส่งอีเมลจริง) หรือ Turnstile Site/Secret Key (กันบอท) · พิมพ์คีย์ในหน้าต่างนี้เท่านั้น

## ประกาศตัวอย่าง (demo)

- `seed/demo.sql` มีประกาศตัวอย่าง **30 รายการ ใน 20 จังหวัดภาคอีสาน** (บ้าน 15 · คอนโด 5 · ที่ดิน/ที่นา 10, ขาย/เช่า) รหัสขึ้นต้น `SL-DEMO`
- ข้อมูลประกาศอยู่ที่ `scripts/demo-listings.json` → สร้าง SQL ใหม่ด้วย `npm run demo:build`
- รูปเป็นภาพเรนเดอร์ 3 มิติ (Blender Cycles) อยู่ใน `public/demo-img/` — ไม่ใช่รูปถ่ายทรัพย์จริง
- ประกาศตัวอย่าง: ติดป้าย "ตัวอย่าง", แสดงแถบแจ้งบนหน้าประกาศ, `noindex`, ไม่อยู่ใน sitemap, ไม่นับเป็นเนื้อหาของหน้า landing, ไม่รับการติดต่อ
- **ซ่อนอัตโนมัติ:** ประกาศจริงแสดงก่อนเสมอ และเมื่อประกาศจริงที่เผยแพร่ครบจำนวนที่ตั้ง (ค่าเริ่มต้น 20 · ปรับได้ที่ `/admin/settings`) ประกาศตัวอย่างจะหายจากเว็บทั้งหมดเอง
- `deploy.bat` อัปเดตประกาศตัวอย่างให้เองเมื่อไฟล์เป็นชุดใหม่ (`-- demo_version`) · ถ้ากด **ลบประกาศตัวอย่างทั้งหมดถาวร** ใน `/admin/settings` แล้ว จะไม่ใส่กลับอีก

## โครงสร้างโฟลเดอร์

```
src/
  index.tsx            entry: fetch + scheduled (cron) + queue
  env.ts               bindings / types
  db/schema.ts         Drizzle schema (ต้นทางของ migrations)
  lib/                 geo, listings (ค้นหา/ดัชนี), thai (ตัดคำ), security, session, jobs (sitemap/cron), settings, util
  routes/              public.tsx, api.ts, admin.tsx, seo.ts (robots/sitemap/รูปจาก R2)
  views/               ui.tsx (layout/components), pages/*, admin/*
public/assets/         css, js (app.js), fonts, vendor/maplibre, img
migrations/            0001_init.sql (drizzle-kit), 0002_history_guards.sql (trigger ห้ามแก้ประวัติ)
seed/geo.sql           77 จังหวัด / 928 อำเภอ / 7,436 ตำบล
seed/demo.sql          ประกาศตัวอย่าง 30 รายการ เขตอีสาน (สร้างจาก scripts/demo-listings.json)
scripts/               build-geo-sql.mjs, build-demo-seed.mjs
```

---

## รันในเครื่อง (Windows / Mac / Linux)

ต้องมี Node.js 22 ขึ้นไป

```bash
npm install
copy .dev.vars.example .dev.vars        # Mac/Linux: cp .dev.vars.example .dev.vars
# แก้ ADMIN_INITIAL_PASSWORD ใน .dev.vars (≥10 ตัว) — ห้าม commit ไฟล์นี้
npm run setup:local                      # migrate + จังหวัด/อำเภอ/ตำบล + ประกาศตัวอย่าง
npm run dev                              # http://127.0.0.1:8787
```

- แอดมิน: http://127.0.0.1:8787/admin ผู้ใช้ `admin` รหัสจาก `.dev.vars` → ระบบบังคับเปลี่ยนรหัส
- ในเครื่องใช้ Turnstile test keys (ผ่านทุกครั้ง)
- ทดสอบ Cron: เปิด http://127.0.0.1:8787/cdn-cgi/handler/scheduled
- ล้างข้อมูลในเครื่องทั้งหมด: ลบโฟลเดอร์ `.wrangler/` แล้ว `npm run setup:local` ใหม่

---

## ขึ้น production แบบอัตโนมัติ (แนะนำ)

```bash
npm install
npx wrangler login          # เปิดเบราว์เซอร์ให้กดอนุญาต (ครั้งเดียว)
npm run deploy:first        # สร้าง D1/R2/KV/Queue, migrate, นำเข้าจังหวัด, deploy, ตั้ง secrets
```
ต้องใช้แผน **Workers Paid** (Queues) · สคริปต์จะถาม Turnstile key (กด Enter เพื่อใช้คีย์ทดสอบชั่วคราว) และพิมพ์รหัสผ่านแอดมินเริ่มต้นให้ตอนจบ
อัปเดตครั้งต่อไปใช้แค่ `npm run deploy` (ถ้ามี migration ใหม่: `npm run db:migrate:remote` ก่อน)

## ขึ้น production แบบทำเองทีละขั้น

1. สมัคร Workers Paid และตั้ง billing notification
2. สร้างทรัพยากร แล้วใส่ id ที่ได้ลงใน `wrangler.toml`
   ```bash
   npx wrangler login
   npx wrangler d1 create smileland-db
   npx wrangler r2 bucket create smileland-uploads
   npx wrangler kv namespace create SESSIONS
   npx wrangler kv namespace create RATELIMIT
   npx wrangler queues create sitemap-jobs
   ```
3. สร้าง Turnstile widget ในแดชบอร์ด → ใส่ site key ที่ `TURNSTILE_SITE_KEY` ใน `wrangler.toml`
4. ตั้ง secrets (ห้ามใส่ในไฟล์)
   ```bash
   npx wrangler secret put TURNSTILE_SECRET_KEY
   npx wrangler secret put ADMIN_INITIAL_PASSWORD
   ```
5. แก้ `SITE_URL` เป็นโดเมนจริง และ (แนะนำ) ผูก custom domain `img.<โดเมน>` กับ bucket แล้วตั้ง `IMG_BASE = "https://img.<โดเมน>"` ให้รูปเสิร์ฟผ่าน CDN โดยตรง
6. Migrate + ข้อมูลภูมิศาสตร์
   ```bash
   npm run db:migrate:remote
   npm run db:geo:remote
   ```
7. `npm run build:check` (ตรวจขนาด bundle) → `npm run deploy` → ทดสอบบน `*.workers.dev` → ผูก Custom Domain
8. ส่ง `https://<โดเมน>/sitemap.xml` ใน Google Search Console

Rollback: `npx wrangler rollback` · D1 กู้คืนด้วย Time Travel (30 วัน)

---

## สิ่งที่ต้องเติม / ยังไม่ทำ

- **ข้อมูลติดต่อและนโยบายความเป็นส่วนตัว**: กรอกที่ `/admin/settings` (เบอร์, LINE OA, อีเมล, ชื่อนิติบุคคล, DPO ฯลฯ) — หน้า `/privacy` จะแสดง "[รอระบุ]" จนกว่าจะกรอก ควรให้นักกฎหมายตรวจทาน
- **นำเข้าข้อมูลจาก smileland-app**: ยังไม่มีสคริปต์ เพราะโครงสร้างตารางเปลี่ยน (ฟิลด์แยกประเภท บ้าน/ที่ดิน/คอนโด) — ถ้ามีข้อมูลจริงใน `data/records.json` ต้องเขียนตัวแปลง แล้วกด "สร้างดัชนีค้นหาใหม่" ที่หน้าตั้งค่า
- ระบบชำระเงิน / ดันประกาศแบบเสียเงิน, แจ้งเตือน LINE/อีเมลเมื่อมีผู้สนใจ, บัญชีสมาชิกนายหน้า — ยังไม่ทำ (เฟสถัดไป)
- แผนที่ใช้ tiles ฟรีจาก OpenFreeMap — ถ้าทราฟฟิกสูงควรพิจารณาผู้ให้บริการแบบมี SLA
