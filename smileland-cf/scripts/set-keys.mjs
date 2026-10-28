// ตั้งคีย์ลับของเว็บ (พิมพ์ในหน้าต่างนี้เท่านั้น — ห้ามส่งคีย์ในแชต)
// ใช้: ดับเบิลคลิก set-keys.bat หรือ node scripts/set-keys.mjs
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';

const env = { ...process.env, WRANGLER_SEND_METRICS: 'false' };
const rl = createInterface({ input: process.stdin, output: process.stdout });
const put = (name, value) => {
  const r = spawnSync(`npx wrangler secret put ${name}`, { shell: true, env, input: value + '\n', encoding: 'utf8' });
  const ok = r.status === 0;
  console.log(ok ? `✓ ตั้ง ${name} แล้ว (มีผลทันที ไม่ต้อง deploy ใหม่)` : `✘ ตั้ง ${name} ไม่สำเร็จ\n${(r.stdout || '') + (r.stderr || '')}`);
  return ok;
};

console.log(`
เลือกคีย์ที่จะตั้ง:
  1) อีเมลจริง — RESEND_API_KEY (จาก resend.com → API Keys)
  2) กันบอท — Turnstile Site Key + Secret Key (จาก Cloudflare Dashboard → Turnstile)
  3) เข้าสู่ระบบด้วย LINE — Channel ID + Channel secret (จาก developers.line.biz → LINE Login channel → Basic settings)
`);
const c = (await rl.question('พิมพ์ 1, 2 หรือ 3 แล้วกด Enter: ')).trim();
if (c === '1') {
  const k = (await rl.question('วาง RESEND_API_KEY (ขึ้นต้นด้วย re_): ')).trim();
  if (!/^re_[A-Za-z0-9_]{10,}$/.test(k)) console.log('✘ รูปแบบคีย์ไม่ถูกต้อง (ต้องขึ้นต้นด้วย re_)');
  else if (put('RESEND_API_KEY', k)) {
    const toml = readFileSync('wrangler.toml', 'utf8');
    const from = (toml.match(/MAIL_FROM\s*=\s*"([^"]+)"/) || [])[1];
    console.log(from ? `ผู้ส่ง: ${from}\nทดสอบได้โดยสมัครสมาชิกใหม่ แล้วดูสถานะที่ /admin/outbox (ควรขึ้น "ส่งแล้ว")` : '⚠ ยังไม่ได้ตั้ง MAIL_FROM ใน wrangler.toml');
  }
} else if (c === '2') {
  const site = (await rl.question('Turnstile Site Key (ขึ้นต้นด้วย 0x): ')).trim();
  const secret = (await rl.question('Turnstile Secret Key (ขึ้นต้นด้วย 0x): ')).trim();
  if (!/^0x[A-Za-z0-9_-]{10,}$/.test(site) || !/^0x[A-Za-z0-9_-]{10,}$/.test(secret)) console.log('✘ รูปแบบคีย์ไม่ถูกต้อง');
  else if (put('TURNSTILE_SECRET_KEY', secret)) {
    let toml = readFileSync('wrangler.toml', 'utf8');
    toml = toml.replace(/TURNSTILE_SITE_KEY\s*=\s*"[^"]*"/, `TURNSTILE_SITE_KEY = "${site}"`);
    writeFileSync('wrangler.toml', toml);
    console.log('✓ บันทึก Site Key ใน wrangler.toml แล้ว — กำลัง deploy เพื่อให้หน้าเว็บใช้คีย์ใหม่...');
    const r = spawnSync('npx wrangler deploy', { shell: true, env, stdio: 'inherit' });
    console.log(r.status === 0 ? '✓ เสร็จ — ฟอร์มบนเว็บใช้ Turnstile จริงแล้ว' : '✘ deploy ไม่สำเร็จ ลองดับเบิลคลิก deploy.bat อีกครั้ง');
  }
} else if (c === '3') {
  const id = (await rl.question('Channel ID (ตัวเลข 10 หลัก): ')).trim();
  const secret = (await rl.question('Channel secret (ตัวอักษร 32 ตัว): ')).trim();
  if (!/^\d{8,12}$/.test(id) || !/^[0-9a-f]{32}$/i.test(secret)) console.log('✘ รูปแบบไม่ถูกต้อง — Channel ID เป็นตัวเลข, Channel secret เป็นตัวอักษร 0-9 a-f 32 ตัว');
  else if (put('LINE_LOGIN_CHANNEL_ID', id) && put('LINE_LOGIN_CHANNEL_SECRET', secret)) {
    console.log('✓ เสร็จ — หน้าเข้าสู่ระบบ/สมัครสมาชิกจะมีปุ่ม "เข้าสู่ระบบด้วย LINE" แล้ว');
  }
} else console.log('ยกเลิก');
rl.close();
