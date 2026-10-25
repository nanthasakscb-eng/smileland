// อีสานน่าอยู่ — deploy รอบปกติ (หลังจากเคย deploy ครั้งแรกแล้ว)
// ใช้: node scripts/deploy-update.mjs   (deploy.bat เรียกให้อัตโนมัติ)
//
// ทำแค่ 3 อย่าง และ "ไม่แตะ" ค่าที่ตั้งไว้แล้ว (โดเมน SITE_URL, รหัสแอดมิน, คีย์ Turnstile, คีย์อีเมล):
//  1) อัปเดตโครงสร้างฐานข้อมูล (migrations ที่ยังไม่เคยรัน)
//  2) อัปเดตประกาศตัวอย่าง เฉพาะเมื่อชุดในไฟล์ใหม่กว่าบนเว็บ และแอดมินยังไม่เคยกด "ลบถาวร"
//  3) wrangler deploy
// ถ้ายังไม่เคย deploy (wrangler.toml ยังไม่มี id ของฐานข้อมูล) จะส่งต่อให้ deploy-first-time.mjs
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const env = { ...process.env, CI: '1', WRANGLER_SEND_METRICS: 'false' };
function run(cmd, { quiet = false, allowFail = false } = {}) {
  if (!quiet) console.log(`\n$ ${cmd}`);
  const r = spawnSync(cmd, { shell: true, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const out = (r.stdout || '') + (r.stderr || '');
  if (!quiet) process.stdout.write(out.split('\n').slice(-20).join('\n') + '\n');
  if (r.status !== 0 && !allowFail) {
    console.error(`\n✘ คำสั่งล้มเหลว: ${cmd}\n${out.split('\n').slice(-40).join('\n')}`);
    process.exit(1);
  }
  return { ok: r.status === 0, out };
}
const step = (s) => console.log(`\n━━━━━━━━ ${s} ━━━━━━━━`);

const toml = readFileSync('wrangler.toml', 'utf8');
const dbId = (toml.match(/database_id\s*=\s*"([0-9a-f-]{36})"/) || [])[1];
if (!dbId) {
  console.log('ยังไม่เคย deploy — เริ่มขั้นตอนติดตั้งครั้งแรก');
  const r = spawnSync('node scripts/deploy-first-time.mjs', { shell: true, stdio: 'inherit', env });
  process.exit(r.status ?? 1);
}

step('1. อัปเดตฐานข้อมูล (migrations)');
run('npx wrangler d1 migrations apply smileland-db --remote');

step('2. ประกาศตัวอย่าง');
const seedFile = 'seed/demo.sql';
const fileVer = existsSync(seedFile) ? (readFileSync(seedFile, 'utf8').match(/^-- demo_version: (\S+)/m) || [])[1] : null;
if (!fileVer) {
  console.log('ไม่มีไฟล์ประกาศตัวอย่าง — ข้าม');
} else {
  const q = run(`npx wrangler d1 execute smileland-db --remote --json --command "SELECT key, value FROM settings WHERE key IN ('demo_version','demo_deleted')"`, { quiet: true, allowFail: true });
  let cur = {};
  try {
    const i = q.out.search(/[\[{]/);
    const rows = JSON.parse(q.out.slice(i))?.[0]?.results ?? [];
    cur = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  } catch { /* อ่านไม่ได้ = ถือว่ายังไม่มี */ }
  if (cur.demo_deleted === '1') console.log('✓ แอดมินลบประกาศตัวอย่างถาวรแล้ว — ไม่ใส่กลับ');
  else if (cur.demo_version === fileVer) console.log(`✓ ประกาศตัวอย่างเป็นชุดล่าสุดแล้ว (${fileVer})`);
  else {
    run(`npx wrangler d1 execute smileland-db --remote --yes --file=${seedFile}`);
    console.log(`✓ อัปเดตประกาศตัวอย่างเป็นชุด ${fileVer} (ชุดเก่าถูกแทนที่)`);
  }
}

step('3. Deploy');
run('npx wrangler deploy');
const site = (toml.match(/SITE_URL\s*=\s*"([^"]+)"/) || [])[1] || '';
console.log(`\n✅ อัปเดตเว็บเรียบร้อย ${site ? '— ' + site : ''}\n   (ไม่ได้เปลี่ยนโดเมน รหัสแอดมิน คีย์ Turnstile หรือคีย์อีเมลที่ตั้งไว้)`);
