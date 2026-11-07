/** ส่งข้อความแจ้งเตือนเข้า LINE ผ่าน Messaging API ของ OA @361oxsdn
 *  - ส่งถึงผู้ใช้ที่เข้าสู่ระบบด้วย LINE (users.line_sub) ได้ เพราะ LINE Login กับ OA อยู่ provider เดียวกัน (user id ตรงกัน)
 *  - ผู้รับต้องเป็นเพื่อนกับ OA และไม่บล็อก ไม่งั้น LINE จะไม่ส่ง (ไม่มีผลกับการทำงานอื่น)
 *  - นับโควตาข้อความของแพ็กเกจ OA
 *  ตั้งค่า: LINE_MESSAGING_TOKEN (Channel access token แบบ long-lived) ผ่าน set-keys.bat ข้อ 4 */
import type { Bindings } from '../env';

export const linePushEnabled = (env: Bindings) => !!env.LINE_MESSAGING_TOKEN;

export async function pushLineText(env: Bindings, to: string, text: string): Promise<boolean> {
  if (!env.LINE_MESSAGING_TOKEN || !/^U[0-9a-f]{32}$/.test(to)) return false;
  try {
    const r = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.LINE_MESSAGING_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, messages: [{ type: 'text', text: text.slice(0, 4900) }] }),
    });
    if (!r.ok) console.error('LINE push failed', r.status, (await r.text()).slice(0, 300));
    return r.ok;
  } catch (e) {
    console.error('LINE push error', String(e));
    return false;
  }
}
