// ตรวจว่าทำไมอีเมลยืนยันสมาชิกไม่ถึงลูกค้า + ทดสอบส่งจริง
// ใช้: ดับเบิลคลิก check-mail.bat (คีย์พิมพ์ในหน้าต่างนี้เท่านั้น — ห้ามส่งคีย์ในแชต)
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';

const env = { ...process.env, WRANGLER_SEND_METRICS: 'false' };
const rl = createInterface({ input: process.stdin, output: process.stdout });
const run = (cmd) => spawnSync(cmd, { shell: true, env, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
const line = (t = '') => console.log(t);
const head = (t) => line(`\n==== ${t} ====`);
const mask = (e) => String(e || '').replace(/^(.).*?(.)?@/, (m, a, b) => `${a}***${b || ''}@`);
const thTime = (s) => new Date(s * 1000).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });

let toml = readFileSync('wrangler.toml', 'utf8');
const from = (toml.match(/MAIL_FROM\s*=\s*"([^"]+)"/) || [])[1] || '';
const fromDomain = (from.match(/@([^>\s]+)/) || [])[1] || '';
const dbName = (toml.match(/database_name\s*=\s*"([^"]+)"/) || [])[1] || 'smileland-db';
const problems = [];
const errText = (r) => ((r.stderr || '') + (r.stdout || '')).replace(/\x1b\[[0-9;]*m/g, '').split('\n').map((x) => x.trim()).filter((x) => x && !/Logs were written|Proxy environment|WARNING/i.test(x)).slice(-3).join(' | ');

head('1) ผู้ส่ง (MAIL_FROM ใน wrangler.toml)');
line(from ? `ผู้ส่ง: ${from}\nโดเมนผู้ส่ง: ${fromDomain}` : '✘ ยังไม่ได้ตั้ง MAIL_FROM');
if (!from) problems.push('ยังไม่ได้ตั้ง MAIL_FROM');

head('2) คีย์ RESEND_API_KEY บน Cloudflare');
const sl = run('npx wrangler secret list');
const hasKey = /RESEND_API_KEY/.test(sl.stdout || '');
if (sl.status !== 0) { line('⚠ อ่านรายการคีย์ไม่ได้: ' + errText(sl)); problems.push('เชื่อม Cloudflare ไม่ได้ (ถ้าเพิ่งเปลี่ยนเครื่อง/บัญชี ให้พิมพ์ npx wrangler login แล้วรันใหม่)'); }
else line(hasKey ? '✓ ตั้ง RESEND_API_KEY แล้ว' : '✘ ยังไม่ได้ตั้ง RESEND_API_KEY → ระบบจะเก็บอีเมลไว้เฉย ๆ ไม่ส่งจริง');
if (sl.status === 0 && !hasKey) problems.push('ยังไม่ได้ตั้ง RESEND_API_KEY (ดับเบิลคลิก set-keys.bat เลือก 1)');

head('3) อีเมลล่าสุดที่ระบบพยายามส่ง (จากฐานข้อมูลจริง)');
const q = run(`npx wrangler d1 execute ${dbName} --remote --json --command "SELECT created_at, kind, to_email, status, error FROM outbox ORDER BY id DESC LIMIT 8"`);
let rows = [];
try { rows = JSON.parse(q.stdout)[0].results || []; } catch { line('⚠ อ่านฐานข้อมูลไม่ได้: ' + errText(q)); problems.push('อ่านประวัติอีเมลจากฐานข้อมูลไม่ได้'); }
if (!rows.length && q.status === 0) line('(ยังไม่มีอีเมลในระบบ)');
for (const r of rows) {
  const st = r.status === 'sent' ? '✓ ส่งแล้ว' : r.status === 'failed' ? '✘ ส่งไม่สำเร็จ' : '… ไม่ได้ส่ง (ยังไม่ตั้งคีย์ตอนนั้น)';
  line(`${thTime(r.created_at)} | ${r.kind} | ${mask(r.to_email)} | ${st}${r.error ? `\n    เหตุผลจาก Resend: ${String(r.error).slice(0, 300)}` : ''}`);
}
const lastErr = rows.find((r) => r.status === 'failed')?.error || '';
if (rows[0]?.status === 'logged') problems.push('อีเมลล่าสุดไม่ได้ส่ง เพราะตอนนั้นยังไม่มี RESEND_API_KEY หรือ MAIL_FROM');
if (rows[0]?.status === 'failed') problems.push('Resend ปฏิเสธการส่ง: ' + String(lastErr).slice(0, 200));

head('4) ตรวจโดเมนใน Resend');
line('วาง RESEND_API_KEY (ขึ้นต้น re_) เพื่อตรวจโดเมนและทดสอบส่ง หรือกด Enter เพื่อข้าม');
const key = (await rl.question('คีย์: ')).trim();
const api = async (path, init = {}) => {
  const r = await fetch('https://api.resend.com' + path, { ...init, headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...(init.headers || {}) } });
  let j = null; try { j = await r.json(); } catch { /* ignore */ }
  return { ok: r.ok, status: r.status, j };
};
const printRecords = (d) => {
  line(`\nต้องเพิ่ม DNS ที่ Cloudflare (dash.cloudflare.com → เลือกโดเมน → DNS → Records → Add record) ตามนี้:`);
  for (const rec of d.records || []) {
    line(`  ชนิด ${rec.type} | Name: ${rec.name} | ${rec.type === 'MX' ? `Priority ${rec.priority} | ` : ''}Value: ${rec.value} | สถานะ: ${rec.status}`);
  }
  line('  * ระเบียน TXT/MX ตั้ง Proxy status = DNS only (เมฆสีเทา)');
  line('  * หรือในหน้า resend.com/domains กดปุ่ม "Auto configure" / "Sign in to Cloudflare" ให้ Resend ใส่ DNS ให้อัตโนมัติ');
  line('  หลังเพิ่มแล้ว กด "Verify DNS records" ในหน้า Resend (ปกติ 5–30 นาที)');
};
if (key) {
  if (!/^re_/.test(key)) line('✘ คีย์ต้องขึ้นต้นด้วย re_');
  else {
    const ds = await api('/domains');
    if (!ds.ok) {
      const msg = ds.j?.message || ds.j?.name || ds.status;
      line(`⚠ ดูรายการโดเมนไม่ได้ (${msg})`);
      if (/restricted|permission/i.test(String(msg))) line('  คีย์นี้เป็นแบบ "Sending access" — ข้ามการตรวจโดเมน ไปทดสอบส่งเลย');
    } else {
      const list = ds.j?.data || [];
      if (!list.length) line('✘ ยังไม่มีโดเมนใน Resend เลย');
      for (const d of list) line(`- ${d.name} : ${d.status === 'verified' ? '✓ ยืนยันแล้ว' : '✘ ' + d.status}`);
      const mine = list.find((d) => d.name.toLowerCase() === fromDomain.toLowerCase());
      const verified = list.filter((d) => d.status === 'verified');
      if (!mine) {
        problems.push(`โดเมนผู้ส่ง ${fromDomain} ยังไม่ได้เพิ่มใน Resend`);
        const other = verified.find((d) => fromDomain.endsWith('.' + d.name) || d.name.endsWith(fromDomain.split('.').slice(-2).join('.')));
        if (other) {
          const a = (await rl.question(`\nพบโดเมนที่ยืนยันแล้ว "${other.name}" — เปลี่ยนผู้ส่งเป็น no-reply@${other.name} แล้ว deploy เลยไหม? (Y/N): `)).trim().toLowerCase();
          if (a === 'y') {
            toml = toml.replace(/MAIL_FROM\s*=\s*"[^"]*"/, `MAIL_FROM = "อีสานน่าอยู่ <no-reply@${other.name}>"`);
            writeFileSync('wrangler.toml', toml);
            line('✓ แก้ MAIL_FROM แล้ว กำลัง deploy...');
            const r = spawnSync('npx wrangler deploy', { shell: true, env, stdio: 'inherit' });
            line(r.status === 0 ? '✓ deploy เสร็จ' : '✘ deploy ไม่สำเร็จ ลองดับเบิลคลิก deploy.bat');
          }
        } else {
          const a = (await rl.question(`\nเพิ่มโดเมน ${fromDomain} เข้า Resend ให้เลยไหม? (Y/N): `)).trim().toLowerCase();
          if (a === 'y') {
            const c = await api('/domains', { method: 'POST', body: JSON.stringify({ name: fromDomain, region: 'ap-northeast-1' }) });
            if (c.ok) { line('✓ เพิ่มโดเมนแล้ว'); printRecords(c.j); } else line('✘ เพิ่มไม่สำเร็จ: ' + (c.j?.message || c.status));
          }
        }
      } else if (mine.status !== 'verified') {
        problems.push(`โดเมน ${fromDomain} ยังไม่ผ่านการยืนยันใน Resend (สถานะ ${mine.status})`);
        const d = await api('/domains/' + mine.id);
        if (d.ok) printRecords(d.j);
      } else line(`✓ โดเมนผู้ส่ง ${fromDomain} ยืนยันแล้ว`);
    }

    head('5) ทดสอบส่งอีเมลจริง');
    const to = (await rl.question('พิมพ์อีเมลของคุณเพื่อรับอีเมลทดสอบ (Enter = ข้าม): ')).trim();
    if (to) {
      const cur = (readFileSync('wrangler.toml', 'utf8').match(/MAIL_FROM\s*=\s*"([^"]+)"/) || [])[1] || from;
      const s = await api('/emails', { method: 'POST', body: JSON.stringify({ from: cur, to: [to], subject: 'ทดสอบอีเมลจาก อีสานน่าอยู่', text: 'ถ้าได้รับอีเมลนี้ แปลว่าระบบส่งอีเมลยืนยันสมาชิกพร้อมใช้งานแล้ว', html: '<p>ถ้าได้รับอีเมลนี้ แปลว่าระบบส่งอีเมลยืนยันสมาชิกพร้อมใช้งานแล้ว ✓</p>' }) });
      if (s.ok) line(`✓ Resend รับเรื่องแล้ว (id ${s.j?.id}) — ดูกล่องจดหมาย และโฟลเดอร์ Spam/Junk`);
      else { line(`✘ ส่งไม่สำเร็จ: ${s.j?.message || s.status}`); problems.push('ทดสอบส่งไม่สำเร็จ: ' + (s.j?.message || s.status)); }
    }
  }
}

head('สรุป');
if (!problems.length) line('✓ ไม่พบปัญหา — ถ้าลูกค้ายังไม่ได้รับ ให้ดูโฟลเดอร์ Spam หรือกด "ส่งลิงก์ยืนยันอีกครั้ง" ในหน้าบัญชี');
else problems.forEach((p, i) => line(`${i + 1}. ${p}`));
line('\nคัดลอกข้อความในหน้าต่างนี้ (ยกเว้นคีย์) ส่งให้ Claude ได้เลย');
rl.close();
