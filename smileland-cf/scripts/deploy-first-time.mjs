// SMILELAND — deploy ขึ้น Cloudflare ครั้งแรกแบบอัตโนมัติ
// ใช้: npx wrangler login   (ครั้งเดียว เปิดเบราว์เซอร์ให้กดอนุญาต)
//      npm run deploy:first
//
// สิ่งที่สคริปต์ทำ (สร้างเฉพาะทรัพยากรชื่อ smileland-* ไม่แตะ Worker/โดเมนอื่นในบัญชี):
//  1) สร้าง D1, R2, KV x2, Queue (ถ้ามีอยู่แล้วจะใช้ของเดิม) แล้วเขียน id ลง wrangler.toml
//  2) migrate ฐานข้อมูล + นำเข้าจังหวัด/อำเภอ/ตำบล (ไม่ใส่ประกาศตัวอย่าง)
//  3) deploy → ได้ URL *.workers.dev → ตั้ง SITE_URL แล้ว deploy ซ้ำ
//  4) ตั้ง secrets: รหัสผ่านแอดมินเริ่มต้น (สุ่มให้) + Turnstile
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, unlinkSync, appendFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline/promises';

const TOML = 'wrangler.toml';
const env = { ...process.env, CI: '1', WRANGLER_SEND_METRICS: 'false' };

function run(cmd, { quiet = false, allowFail = false } = {}) {
  if (!quiet) console.log(`\n$ ${cmd}`);
  const r = spawnSync(cmd, { shell: true, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const out = (r.stdout || '') + (r.stderr || '');
  if (!quiet) process.stdout.write(out.split('\n').slice(-25).join('\n') + '\n');
  if (r.status !== 0 && !allowFail) {
    console.error(`\n✘ คำสั่งล้มเหลว: ${cmd}\n${out}`);
    process.exit(1);
  }
  return { ok: r.status === 0, out };
}
const json = (cmd) => {
  const { out } = run(cmd, { quiet: true });
  const i = out.search(/[\[{]/);
  return JSON.parse(out.slice(i));
};
const step = (s) => console.log(`\n━━━━━━━━ ${s} ━━━━━━━━`);
let toml = readFileSync(TOML, 'utf8');
const setToml = (re, val) => { toml = toml.replace(re, val); writeFileSync(TOML, toml); };

step('0. ตรวจการเข้าสู่ระบบ Cloudflare');
const who = run('npx wrangler whoami', { quiet: true, allowFail: true });
if (!who.ok || /not authenticated|You are not/i.test(who.out)) {
  console.error('✘ ยังไม่ได้เข้าสู่ระบบ — รัน `npx wrangler login` ก่อน แล้วรันสคริปต์นี้อีกครั้ง');
  process.exit(1);
}
console.log(who.out.split('\n').filter((l) => /@|Account|│/.test(l)).slice(0, 8).join('\n'));

step('1. สร้าง/ค้นหาทรัพยากร');
// D1
let d1 = json('npx wrangler d1 list --json').find((d) => d.name === 'smileland-db');
if (!d1) { run('npx wrangler d1 create smileland-db --location apac'); d1 = json('npx wrangler d1 list --json').find((d) => d.name === 'smileland-db'); }
if (!d1) { console.error('✘ หา D1 smileland-db ไม่เจอ'); process.exit(1); }
setToml(/database_id = "[^"]*"/, `database_id = "${d1.uuid}"`);
console.log('✓ D1 smileland-db', d1.uuid);

// R2
const r2res = run('npx wrangler r2 bucket list', { quiet: true, allowFail: true });
if (!r2res.ok) {
  if (/10042|enable R2/i.test(r2res.out)) console.error('\n✘ บัญชียังไม่ได้เปิดใช้ R2\n  ไปที่ Cloudflare Dashboard → R2 Object Storage → กด "Purchase R2 Plan"/"Enable R2" (ใช้ฟรีได้ 10GB/เดือน แต่ต้องผูกช่องทางชำระเงิน)\n  เสร็จแล้วดับเบิลคลิก deploy.bat อีกครั้ง — ขั้นที่ทำไปแล้วจะข้ามให้อัตโนมัติ');
  else console.error(r2res.out);
  process.exit(1);
}
const r2 = r2res.out;
if (!/smileland-uploads/.test(r2)) run('npx wrangler r2 bucket create smileland-uploads');
console.log('✓ R2 smileland-uploads');

// KV
for (const [binding, title] of [['SESSIONS', 'smileland-sessions'], ['RATELIMIT', 'smileland-ratelimit']]) {
  let ns = json('npx wrangler kv namespace list').find((n) => n.title === title);
  if (!ns) { run(`npx wrangler kv namespace create ${title}`); ns = json('npx wrangler kv namespace list').find((n) => n.title === title); }
  if (!ns) { console.error(`✘ หา KV ${title} ไม่เจอ`); process.exit(1); }
  setToml(new RegExp(`(binding = "${binding}"\\r?\\nid = )"[^"]*"`), `$1"${ns.id}"`);
  console.log(`✓ KV ${title}`, ns.id);
}

// Queue (ต้องใช้ Workers Paid)
const q = run('npx wrangler queues list', { quiet: true, allowFail: true }).out;
if (!/sitemap-jobs/.test(q)) {
  const r = run('npx wrangler queues create sitemap-jobs', { allowFail: true });
  if (!r.ok) {
    console.error('\n✘ สร้าง Queue ไม่ได้ — Queues ต้องใช้แผน Workers Paid ($5/เดือน)\n  สมัครที่ Cloudflare Dashboard → Workers & Pages → Plans แล้วรันสคริปต์อีกครั้ง');
    process.exit(1);
  }
}
console.log('✓ Queue sitemap-jobs');

step('2. ฐานข้อมูล (production)');
run('npx wrangler d1 migrations apply smileland-db --remote');
const cnt = json('npx wrangler d1 execute smileland-db --remote --json --command "SELECT count(*) AS n FROM provinces"');
const n = cnt?.[0]?.results?.[0]?.n ?? 0;
if (n < 77) run('npx wrangler d1 execute smileland-db --remote --yes --file=seed/geo.sql');
else console.log('✓ มีข้อมูลจังหวัดแล้ว ข้ามขั้นนี้');

step('3. Turnstile');
const AUTO = process.env.SL_NONINTERACTIVE === '1';
let site = process.env.SL_TURNSTILE_SITE || '', secret = process.env.SL_TURNSTILE_SECRET || '', demoAns = process.env.SL_DEMO === '1' ? 'y' : '';
if (!AUTO) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  console.log('สร้าง widget ได้ที่ Cloudflare Dashboard → Turnstile → Add widget (ใส่โดเมน *.workers.dev และโดเมนจริง)');
  site = (await rl.question('Turnstile Site Key (Enter = ใช้คีย์ทดสอบชั่วคราว): ')).trim();
  if (site) secret = (await rl.question('Turnstile Secret Key: ')).trim();
  demoAns = (await rl.question('ใส่ประกาศตัวอย่าง 200 รายการ (ทุกจังหวัด) เพื่อดูหน้าตาเว็บ? ติดป้าย "ตัวอย่าง" และลบได้ภายหลัง [y/N]: ')).trim().toLowerCase();
  rl.close();
}
if (demoAns === 'y' || demoAns === 'yes') { run('npx wrangler d1 execute smileland-db --remote --yes --file=seed/demo.sql'); console.log('✓ ใส่ประกาศตัวอย่างแล้ว — ลบได้ที่ /admin/settings → "ลบประกาศตัวอย่างทั้งหมด"'); }
if (!site || !secret) {
  site = '1x00000000000000000000AA'; secret = '1x0000000000000000000000000000000AA';
  console.log('⚠ ใช้คีย์ทดสอบ Turnstile (ผ่านทุกครั้ง = ยังไม่กันบอท) — เปลี่ยนเป็นคีย์จริงก่อนเปิดใช้งานจริง');
}
setToml(/TURNSTILE_SITE_KEY = "[^"]*"/, `TURNSTILE_SITE_KEY = "${site}"`);

step('4. Deploy');
const dep = run('npx wrangler deploy');
const url = (dep.out.match(/https:\/\/smileland\.[a-z0-9-]+\.workers\.dev/) || [])[0];
if (url) {
  setToml(/SITE_URL = "[^"]*"/, `SITE_URL = "${url}"`);
  setToml(/IMG_BASE = "[^"]*"/, 'IMG_BASE = "/img"');
}

step('5. Secrets');
const adminPw = randomBytes(9).toString('base64').replace(/[+/=]/g, 'x') + '-Sl1';
const tmp = '.secrets.tmp.json';
writeFileSync(tmp, JSON.stringify({ ADMIN_INITIAL_PASSWORD: adminPw, TURNSTILE_SECRET_KEY: secret }));
try { run(`npx wrangler secret bulk ${tmp}`); } finally { unlinkSync(tmp); }

if (url) { step('6. Deploy อีกครั้ง (ตั้ง SITE_URL)'); run('npx wrangler deploy'); }
writeFileSync('ADMIN-PASSWORD.txt', `SMILELAND admin\r\nURL: ${url ? url + '/admin' : '/admin'}\r\nผู้ใช้: admin\r\nรหัสผ่านเริ่มต้น: ${adminPw}\r\n(ระบบบังคับเปลี่ยนรหัสเมื่อเข้าครั้งแรก — ลบไฟล์นี้หลังเปลี่ยนรหัสแล้ว)\r\n`);
void appendFileSync;

console.log(`
✅ เสร็จแล้ว
   เว็บไซต์:  ${url || '(ดู URL จากผล deploy ด้านบน)'}
   แอดมิน:    ${url ? url + '/admin' : '/admin'}
   ผู้ใช้:     admin
   รหัสผ่านเริ่มต้น: ${adminPw}
   (ระบบจะบังคับเปลี่ยนรหัสเมื่อเข้าครั้งแรก — อย่าส่งรหัสนี้ในแชต)

ขั้นต่อไป:
 - เข้า /admin/settings กรอกเบอร์โทร LINE อีเมล ข้อมูลนโยบายความเป็นส่วนตัว
 - ผูกโดเมนจริง: Dashboard → Workers → smileland → Settings → Domains & Routes
   แล้วแก้ SITE_URL ใน wrangler.toml เป็นโดเมนจริง → npm run deploy
 - ส่ง <โดเมน>/sitemap.xml ใน Google Search Console
`);
