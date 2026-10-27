// ตั้งรหัสผ่านแอดมินใหม่ / สร้างบัญชีเจ้าของระบบ (พิมพ์รหัสในหน้าต่างนี้เท่านั้น — ไม่บันทึกลงไฟล์)
// ใช้: ดับเบิลคลิก reset-admin.bat หรือ node scripts/reset-admin.mjs
import { spawnSync } from 'node:child_process';
import { webcrypto as crypto } from 'node:crypto';

const env = { ...process.env, WRANGLER_SEND_METRICS: 'false' };
const run = (cmd) => {
  const r = spawnSync(cmd, { shell: true, env, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  return { ok: r.status === 0, out: (r.stdout || '') + (r.stderr || '') };
};
const hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');

/** อ่านคำตอบ 1 บรรทัด — hidden = แสดง * แทนตัวอักษร (เมื่อเป็นหน้าต่างพิมพ์จริง) */
const stdin = process.stdin;
let buf = '';
stdin.setEncoding('utf8');
function ask(q, hidden = false) {
  process.stdout.write(q);
  return new Promise((resolve) => {
    let s = '';
    const tty = !!stdin.isTTY;
    if (tty) stdin.setRawMode(true);
    stdin.resume();
    const done = (v) => { stdin.off('data', on); if (tty) stdin.setRawMode(false); stdin.pause(); if (tty) process.stdout.write('\n'); resolve(v); };
    const on = (chunk) => {
      if (!tty) { buf += chunk; const i = buf.indexOf('\n'); if (i >= 0) { const line = buf.slice(0, i).replace(/\r$/, ''); buf = buf.slice(i + 1); process.stdout.write('\n'); done(line); } return; }
      for (const c of chunk) {
        if (c === '\r' || c === '\n') return done(s);
        if (c === '\u0003') { process.stdout.write('\nยกเลิก\n'); process.exit(1); }
        if (c === '\u0008' || c === '\u007f') { if (s) { s = s.slice(0, -1); process.stdout.write('\b \b'); } continue; }
        s += c; process.stdout.write(hidden ? '*' : c);
      }
    };
    // ข้อมูลที่ค้างใน buffer (กรณี pipe)
    if (!tty && buf.includes('\n')) { const i = buf.indexOf('\n'); const line = buf.slice(0, i).replace(/\r$/, ''); buf = buf.slice(i + 1); process.stdout.write('\n'); stdin.pause(); return resolve(line); }
    stdin.on('data', on);
  });
}

const fail = () => { process.exitCode = 1; };
const LOC = process.env.SL_LOCAL ? '--local' : '--remote';
const interactive = (cmd) => spawnSync(cmd, { shell: true, env, stdio: 'inherit' }).status === 0;

async function checkAccount() {
  if (process.env.SL_LOCAL) return true;
  for (;;) {
    const who = run('npx wrangler whoami');
    if (!who.ok || /not authenticated|You are not/i.test(who.out)) {
      console.log('\nยังไม่ได้ล็อกอิน Cloudflare — กำลังเปิดเบราว์เซอร์ ให้ล็อกอินด้วยอีเมลเจ้าของเว็บแล้วกด Allow');
      interactive('npx wrangler login');
      continue;
    }
    const email = (who.out.match(/associated with the email\s+([^\s.]+@[^\s]+?)\.?\s/i) || who.out.match(/([\w.+-]+@[\w-]+\.[\w.-]+)/) || [])[1] || '(ไม่ทราบอีเมล)';
    console.log(`\nตอนนี้ล็อกอิน Cloudflare ด้วย: ${email}`);
    const a = (await ask('ใช่บัญชีเจ้าของเว็บไหม? พิมพ์ Y = ใช่ / N = ออกจากระบบแล้วล็อกอินบัญชีอื่น: ')).trim().toLowerCase();
    if (a === 'y' || a === '') return true;
    console.log('\nกำลังออกจากระบบ... ในเบราว์เซอร์ให้ออกจาก dash.cloudflare.com ก่อน แล้วล็อกอินด้วยอีเมลที่ถูกต้อง จากนั้นกด Allow');
    interactive('npx wrangler logout');
    interactive('npx wrangler login');
  }
}

async function main() {
  if (!(await checkAccount())) return fail();
console.log('\nกำลังอ่านรายชื่อผู้ดูแลจากเว็บจริง...');
  const q = run(`npx wrangler d1 execute smileland-db ${LOC} --json --command "SELECT username, is_owner FROM admins ORDER BY id"`);
  if (!q.ok) { console.error(/7403|not authorized/.test(q.out) ? '✘ บัญชี Cloudflare ที่ล็อกอินอยู่ไม่ใช่บัญชีที่เก็บฐานข้อมูลเว็บ — รันใหม่แล้วตอบ N เพื่อสลับไปบัญชีเจ้าของเว็บ' : '✘ เชื่อมต่อฐานข้อมูลไม่ได้\n' + q.out.slice(-800)); return fail(); }
  let rows = [];
  try { rows = JSON.parse(q.out.slice(q.out.search(/[\[{]/)))?.[0]?.results ?? []; } catch { /* ignore */ }
  console.log(rows.length ? 'ผู้ดูแลที่มีอยู่: ' + rows.map((r) => r.username + (r.is_owner ? ' (เจ้าของระบบ)' : '')).join(', ') : 'ยังไม่มีผู้ดูแลในระบบ');
  
  const username = ((await ask('\nชื่อผู้ใช้ที่จะตั้งรหัสใหม่ (Enter = admin): ')).trim() || 'admin').toLowerCase();
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) { console.error('✘ ชื่อผู้ใช้ใช้ได้เฉพาะ a-z 0-9 . _ - ยาว 3–30 ตัว'); return fail(); }
  const pw = await ask('รหัสผ่านใหม่ (อย่างน้อย 10 ตัว ตัวอักษรจะแสดงเป็น *): ', true);
  const pw2 = await ask('พิมพ์รหัสผ่านอีกครั้ง: ', true);
  if (pw.length < 10) { console.error('✘ รหัสผ่านต้องมีอย่างน้อย 10 ตัวอักษร'); return fail(); }
  if (pw !== pw2) { console.error('✘ รหัสผ่านสองช่องไม่ตรงกัน'); return fail(); }
  
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 }, key, 256);
  const sql = `INSERT INTO admins (username, pass_hash, salt, iterations, must_change, is_owner, permissions) VALUES ('${username}', '${hex(bits)}', '${hex(salt)}', 100000, 0, 1, '[]') ON CONFLICT(username) DO UPDATE SET pass_hash = excluded.pass_hash, salt = excluded.salt, iterations = excluded.iterations, must_change = 0, is_owner = 1`;
  const w = run(`npx wrangler d1 execute smileland-db ${LOC} --command "${sql}"`);
  if (!w.ok) { console.error('✘ บันทึกไม่สำเร็จ\n' + w.out.slice(-800)); return fail(); }
  const site = (run('node -e "process.stdout.write(require(\'fs\').readFileSync(\'wrangler.toml\',\'utf8\').match(/SITE_URL\\s*=\\s*\\"([^\\"]+)/)[1])"').out || '').trim();
  console.log(`\n✅ ตั้งรหัสผ่านของ "${username}" แล้ว (สิทธิ์เจ้าของระบบ)\n   เข้าหน้าแอดมินที่: ${site ? site + '/admin' : '/admin'}\n   ถ้าเพิ่งใส่รหัสผิดหลายครั้ง ระบบอาจล็อกชั่วคราว 15 นาที`);
}
await main();
stdin.destroy();
