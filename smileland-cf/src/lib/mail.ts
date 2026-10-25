import type { Bindings } from '../env';
import { db } from '../db';
import { outbox } from '../db/schema';

/** ส่งอีเมล: ถ้าตั้ง RESEND_API_KEY + MAIL_FROM จะส่งจริงผ่าน Resend
 *  ถ้ายังไม่ตั้ง → บันทึกไว้ใน outbox (status = logged) ให้แอดมินดูลิงก์/ยืนยันแทนที่ /admin/outbox */
export async function sendMail(env: Bindings, m: { to: string; subject: string; text: string; html: string; kind?: string; userId?: number }) {
  let status = 'logged', error: string | null = null;
  if (env.RESEND_API_KEY && env.MAIL_FROM) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: env.MAIL_FROM, to: [m.to], subject: m.subject, html: m.html, text: m.text }),
      });
      if (r.ok) status = 'sent';
      else { status = 'failed'; error = (await r.text()).slice(0, 500); }
    } catch (e) {
      status = 'failed'; error = String(e).slice(0, 500);
    }
  }
  await db(env).insert(outbox).values({ toEmail: m.to, subject: m.subject, bodyText: m.text, kind: m.kind ?? 'other', userId: m.userId ?? null, status, error });
  return status;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);

export function mailTemplate(title: string, lines: string[], button?: { label: string; url: string }) {
  const text = [title, '', ...lines, ...(button ? ['', `${button.label}: ${button.url}`] : []), '', '— อีสานน่าอยู่'].join('\n');
  const html = `<!doctype html><html lang="th"><body style="margin:0;background:#f7f5f0;font-family:Tahoma,'Sarabun',sans-serif;color:#1c2430">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:28px 12px"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e6e0d4">
<tr><td style="background:#0f1d2c;padding:20px 28px;color:#fff;font-family:Georgia,serif;letter-spacing:3px;font-size:20px;font-weight:bold">อีสานน่าอยู่</td></tr>
<tr><td style="padding:28px">
<h1 style="font-size:20px;margin:0 0 14px;color:#0f1d2c">${esc(title)}</h1>
${lines.map((l) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.7">${esc(l)}</p>`).join('')}
${button ? `<p style="margin:22px 0"><a href="${esc(button.url)}" style="background:#b8924a;color:#1b1408;text-decoration:none;padding:12px 26px;border-radius:999px;font-weight:bold;display:inline-block">${esc(button.label)}</a></p>
<p style="font-size:12px;color:#667085;word-break:break-all">หรือคัดลอกลิงก์: ${esc(button.url)}</p>` : ''}
</td></tr>
<tr><td style="padding:16px 28px;background:#fbfaf7;font-size:12px;color:#98a2b3">อีเมลนี้ส่งอัตโนมัติจาก อีสานน่าอยู่ — หากคุณไม่ได้ทำรายการนี้ โปรดเพิกเฉย</td></tr>
</table></td></tr></table></body></html>`;
  return { text, html };
}
