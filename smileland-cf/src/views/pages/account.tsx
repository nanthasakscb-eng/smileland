/** @jsxImportSource hono/jsx */
import type { Child, FC } from 'hono/jsx';
import type { Bindings, UserSession } from '../../env';
import type { Lead, Listing, User } from '../../db/schema';
import { Crumbs, Icon, StatusBadge, Turnstile } from '../ui';
import { DEALS, TYPES, formatPrice, thaiDate, thaiDateTime, type Deal, type PType } from '../../lib/util';
import { imgUrl, placeholder } from '../../lib/listings';

const AuthShell: FC<{ title: string; sub?: string; children?: Child }> = ({ title, sub, children }) => (
  <div class="wrap" style="max-width:520px;padding-bottom:64px">
    <div class="page-head" style="text-align:center;padding-top:40px">
      <h1 style="font-size:30px">{title}</h1>
      {sub && <p class="muted">{sub}</p>}
    </div>
    <div class="form-card">{children}</div>
  </div>
);
const Err: FC<{ e?: string }> = ({ e }) => (e ? <div class="alert alert-bad">{e}</div> : null);
const Ok: FC<{ m?: string }> = ({ m }) => (m ? <div class="alert alert-ok">{m}</div> : null);

export const RegisterPage: FC<{ env: Bindings; error?: string; v?: Record<string, string> }> = ({ env, error, v = {} }) => (
  <AuthShell title="สมัครสมาชิก" sub="สมัครฟรี ยืนยันอีเมลแล้วลงประกาศขาย/ให้เช่าได้ทันที">
    <Err e={error} />
    <form method="post" action="/register">
      <div class="field"><label class="req" for="r-name">ชื่อ-นามสกุล / ชื่อที่ใช้ติดต่อ</label><input id="r-name" class="input" name="name" required maxlength={80} value={v.name || ''} autocomplete="name" /></div>
      <div class="field"><label class="req" for="r-email">อีเมล</label><input id="r-email" class="input" type="email" name="email" required maxlength={120} value={v.email || ''} autocomplete="email" /></div>
      <div class="field"><label class="req" for="r-phone">เบอร์โทร</label><input id="r-phone" class="input" name="phone" required inputmode="tel" maxlength={15} value={v.phone || ''} autocomplete="tel" /><div class="hint">ไม่แสดงบนหน้าเว็บ ใช้ให้ทีมงานติดต่อกลับ</div></div>
      <div class="field"><label class="req" for="r-pw">รหัสผ่าน</label><input id="r-pw" class="input" type="password" name="password" required minlength={8} maxlength={200} autocomplete="new-password" /><div class="hint">อย่างน้อย 8 ตัวอักษร</div></div>
      <label class="check small" style="margin-bottom:12px"><input type="checkbox" name="consent" value="1" required /> <span>ยอมรับ<a href="/terms" target="_blank" style="text-decoration:underline">ข้อกำหนด</a>และ<a href="/privacy" target="_blank" style="text-decoration:underline">นโยบายความเป็นส่วนตัว</a></span></label>
      <Turnstile env={env} />
      <button class="btn btn-gold btn-block btn-lg" type="submit" style="margin-top:12px">สมัครสมาชิก</button>
    </form>
    <p class="center small" style="margin:16px 0 0">มีบัญชีแล้ว? <a href="/login" style="text-decoration:underline">เข้าสู่ระบบ</a></p>
  </AuthShell>
);

export const LoginPage: FC<{ env: Bindings; error?: string; ok?: string; next?: string; email?: string }> = ({ env, error, ok, next, email }) => (
  <AuthShell title="เข้าสู่ระบบ" sub="สำหรับสมาชิกผู้ลงประกาศ">
    <Err e={error} /><Ok m={ok} />
    <form method="post" action="/login">
      <input type="hidden" name="next" value={next || ''} />
      <div class="field"><label for="l-email">อีเมล</label><input id="l-email" class="input" type="email" name="email" required maxlength={120} value={email || ''} autocomplete="email" /></div>
      <div class="field"><label for="l-pw">รหัสผ่าน</label><input id="l-pw" class="input" type="password" name="password" required maxlength={200} autocomplete="current-password" /></div>
      <Turnstile env={env} />
      <button class="btn btn-ink btn-block btn-lg" type="submit" style="margin-top:12px">เข้าสู่ระบบ</button>
    </form>
    <p class="center small" style="margin:16px 0 0"><a href="/forgot" style="text-decoration:underline">ลืมรหัสผ่าน?</a> · ยังไม่มีบัญชี? <a href="/register" style="text-decoration:underline">สมัครสมาชิก</a></p>
  </AuthShell>
);

export const CheckEmailPage: FC<{ email: string; csrf?: string; resent?: boolean; logged?: boolean }> = ({ email, csrf, resent, logged }) => (
  <AuthShell title="ยืนยันอีเมลของคุณ">
    <div style="text-align:center">
      <div style="width:64px;height:64px;border-radius:50%;background:var(--gold-soft);color:#6b4e14;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:28px">✉</div>
      <p>เราส่งลิงก์ยืนยันไปที่ <b>{email}</b> แล้ว</p>
      <p class="muted small">เปิดอีเมลแล้วกดปุ่ม "ยืนยันอีเมล" จากนั้นจึงลงประกาศได้ · ถ้าไม่เห็นอีเมล ลองดูในโฟลเดอร์จดหมายขยะ (Spam)</p>
      {resent && <div class="alert alert-ok">ส่งลิงก์ยืนยันอีกครั้งแล้ว</div>}
      {logged && <div class="alert alert-info small" style="text-align:left">ระบบยังไม่ได้ตั้งค่าบริการส่งอีเมล — ทีมงานจะยืนยันบัญชีให้ หรือติดต่อทีมงานเพื่อรับลิงก์ยืนยัน</div>}
      {csrf && (
        <form method="post" action="/account/resend-verify" style="margin-top:8px">
          <input type="hidden" name="csrf" value={csrf} />
          <button class="btn btn-line" type="submit">ส่งลิงก์ยืนยันอีกครั้ง</button>
        </form>
      )}
    </div>
  </AuthShell>
);

export const MessagePage: FC<{ title: string; text: string; ok?: boolean; action?: { href: string; label: string } }> = ({ title, text, ok, action }) => (
  <AuthShell title={title}>
    <div style="text-align:center">
      <div style={`width:64px;height:64px;border-radius:50%;background:${ok ? 'var(--ok-bg)' : 'var(--bad-bg)'};color:${ok ? 'var(--ok)' : 'var(--bad)'};display:flex;align-items:center;justify-content:center;margin:0 auto 14px;font-size:28px`}>{ok ? '✓' : '!'}</div>
      <p>{text}</p>
      {action && <a class="btn btn-gold" href={action.href}>{action.label}</a>}
    </div>
  </AuthShell>
);

export const ForgotPage: FC<{ env: Bindings; sent?: boolean; error?: string }> = ({ env, sent, error }) => (
  <AuthShell title="ลืมรหัสผ่าน" sub="กรอกอีเมลที่ใช้สมัคร เราจะส่งลิงก์ตั้งรหัสผ่านใหม่ให้">
    <Err e={error} />
    {sent ? <div class="alert alert-ok">ถ้าอีเมลนี้มีบัญชีอยู่ เราได้ส่งลิงก์ตั้งรหัสผ่านใหม่ไปแล้ว (ใช้ได้ 1 ชั่วโมง)</div> : (
      <form method="post" action="/forgot">
        <div class="field"><label for="f-email">อีเมล</label><input id="f-email" class="input" type="email" name="email" required maxlength={120} autocomplete="email" /></div>
        <Turnstile env={env} />
        <button class="btn btn-ink btn-block" type="submit" style="margin-top:12px">ส่งลิงก์ตั้งรหัสผ่านใหม่</button>
      </form>
    )}
    <p class="center small" style="margin:16px 0 0"><a href="/login" style="text-decoration:underline">กลับไปเข้าสู่ระบบ</a></p>
  </AuthShell>
);

export const ResetPage: FC<{ token: string; error?: string }> = ({ token, error }) => (
  <AuthShell title="ตั้งรหัสผ่านใหม่">
    <Err e={error} />
    <form method="post" action="/reset">
      <input type="hidden" name="token" value={token} />
      <div class="field"><label for="rs-pw">รหัสผ่านใหม่</label><input id="rs-pw" class="input" type="password" name="password" required minlength={8} autocomplete="new-password" /></div>
      <div class="field"><label for="rs-pw2">ยืนยันรหัสผ่านใหม่</label><input id="rs-pw2" class="input" type="password" name="password2" required minlength={8} autocomplete="new-password" /></div>
      <button class="btn btn-ink btn-block" type="submit">บันทึกรหัสผ่านใหม่</button>
    </form>
  </AuthShell>
);

export const NeedVerify: FC<{ user: UserSession }> = ({ user }) => (
  <div class="wrap" style="max-width:640px;padding:48px 20px 64px">
    <div class="form-card center">
      <h1 style="font-size:26px">ยืนยันอีเมลก่อนลงประกาศ</h1>
      <p>บัญชี <b>{user.email}</b> ยังไม่ได้ยืนยันอีเมล กรุณากดลิงก์ในอีเมลที่เราส่งไป</p>
      <form method="post" action="/account/resend-verify" style="display:inline"><input type="hidden" name="csrf" value={user.csrf} /><button class="btn btn-gold" type="submit">ส่งลิงก์ยืนยันอีกครั้ง</button></form>
      <a class="btn btn-line" href="/account" style="margin-left:8px">บัญชีของฉัน</a>
    </div>
  </div>
);

type Row = Listing & { leadCount: number; provinceName?: string };
export const AccountPage: FC<{ env: Bindings; user: User; sess: UserSession; rows: Row[]; leads: (Lead & { listingRef?: string | null })[]; msg?: string; error?: string; tab: string }> = ({ env, user, sess, rows, leads, msg, error, tab }) => (
  <div class="wrap" style="padding-bottom:64px">
    <Crumbs items={[['หน้าแรก', '/'], ['บัญชีของฉัน']]} />
    <div class="page-head" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
      <div><h1 style="margin:0">สวัสดี คุณ{user.name}</h1><p class="muted" style="margin:4px 0 0">{user.email} · สมาชิกตั้งแต่ {thaiDate(user.createdAt)}</p></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <a class="btn btn-gold" href="/post">+ ลงประกาศใหม่</a>
        <form method="post" action="/logout"><input type="hidden" name="csrf" value={sess.csrf} /><button class="btn btn-line" type="submit">ออกจากระบบ</button></form>
      </div>
    </div>
    {!user.emailVerifiedAt && (
      <div class="alert alert-warn" style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap">
        <span>ยังไม่ได้ยืนยันอีเมล — ต้องยืนยันก่อนจึงลงประกาศได้</span>
        <form method="post" action="/account/resend-verify"><input type="hidden" name="csrf" value={sess.csrf} /><button class="btn btn-ink btn-sm" type="submit">ส่งลิงก์ยืนยันอีกครั้ง</button></form>
      </div>
    )}
    {msg && <div class="alert alert-ok">{msg}</div>}
    {error && <div class="alert alert-bad">{error}</div>}
    <div class="sub-links">
      <a href="/account" class={tab === 'listings' ? 'on' : ''}>ประกาศของฉัน <span class="n">{rows.length}</span></a>
      <a href="/account?tab=leads" class={tab === 'leads' ? 'on' : ''}>ผู้สนใจ <span class="n">{leads.length}</span></a>
      <a href="/account?tab=profile" class={tab === 'profile' ? 'on' : ''}>ข้อมูลส่วนตัว</a>
    </div>

    {tab === 'listings' && rows.length > 0 && (() => {
      const n = (st: string) => rows.filter((r) => r.status === st).length;
      return (
        <div class="st-summary">
          <div class="pending"><b>{n('pending')}</b><span>รอตรวจสอบ</span></div>
          <div class="rejected"><b>{n('rejected')}</b><span>ต้องแก้ไข</span></div>
          <div class="active"><b>{n('active')}</b><span>เผยแพร่อยู่</span></div>
          <div><b>{n('sold') + n('closed') + n('expired')}</b><span>ปิด/หมดอายุ</span></div>
        </div>
      );
    })()}
    {tab === 'listings' && (rows.length === 0 ? (
      <div class="empty"><h3>ยังไม่มีประกาศ</h3><p class="muted">เริ่มลงประกาศขายหรือให้เช่าทรัพย์ของคุณได้ฟรี</p><a class="btn btn-gold" href="/post">ลงประกาศฟรี</a></div>
    ) : (
      <div class="table-wrap">
        <table class="t">
          <thead><tr><th></th><th>ประกาศ</th><th>ราคา</th><th>สถานะ</th><th>เข้าชม</th><th>ผู้สนใจ</th><th>จัดการ</th></tr></thead>
          <tbody>
            {rows.map((l) => (
              <tr>
                <td class="thumbcell"><img src={imgUrl(env, l.coverKey, 400) || placeholder(l.type)} alt="" loading="lazy" /></td>
                <td style="min-width:220px"><b>{l.ref}</b><div class="small">{l.title}</div><div class="tiny muted">{TYPES[l.type as PType]}{DEALS[l.deal as Deal]} · {l.provinceName} · ส่งเมื่อ {thaiDate(l.createdAt)}</div>
                  {l.status === 'rejected' && (
                    <div class="fix-box"><b>ต้องแก้ไขก่อนเผยแพร่</b>{l.rejectReason && <div>เหตุผลจากทีมงาน: “{l.rejectReason}”</div>}
                      <a class="btn btn-gold btn-sm" href={`/account/listings/${l.id}/edit`}>แก้ไขแล้วส่งใหม่</a></div>
                  )}</td>
                <td class="nowrap">฿{formatPrice(l.price)}</td>
                <td><StatusBadge s={l.status} />
                  {['pending', 'rejected', 'active'].includes(l.status) && (
                    <ol class="st-steps" aria-label="ขั้นตอน">
                      <li class="done">ส่งแล้ว</li>
                      <li class={l.status === 'pending' ? 'now' : l.status === 'rejected' ? 'bad' : 'done'}>{l.status === 'rejected' ? 'ต้องแก้ไข' : 'ตรวจสอบ'}</li>
                      <li class={l.status === 'active' ? 'done' : ''}>เผยแพร่</li>
                    </ol>
                  )}
                  {l.status === 'pending' && <div class="tiny muted">{l.revision ? `ส่งแก้ไขครั้งที่ ${l.revision} · ` : ''}รอทีมงานตรวจ ภายใน 24 ชม.</div>}
                  {l.status === 'active' && <div class="tiny muted">หมดอายุ {thaiDate(l.expiresAt)}</div>}</td>
                <td class="nowrap"><Icon name="eye" /> {formatPrice(l.views)}</td>
                <td><a href="/account?tab=leads">{l.leadCount}</a></td>
                <td style="min-width:230px">
                  {['active', 'pending'].includes(l.status) && (
                    <form method="post" action={`/account/listings/${l.id}`} style="display:flex;gap:4px;margin-bottom:4px">
                      <input type="hidden" name="csrf" value={sess.csrf} /><input type="hidden" name="action" value="price" />
                      <input class="input" name="price" data-money value={formatPrice(l.price)} style="padding:4px 8px;font-size:14px" aria-label="ราคาใหม่" />
                      <button class="btn btn-line btn-sm" type="submit">ปรับราคา</button>
                    </form>
                  )}
                  <div style="display:flex;gap:4px;flex-wrap:wrap">
                    {l.status === 'pending' && <a class="btn btn-line btn-sm" href={`/account/listings/${l.id}/edit`}>แก้ไขประกาศ</a>}
                    {l.status === 'active' && <a class="btn btn-ghost btn-sm" href={`/listing/${l.id}`}>ดูหน้าเว็บ</a>}
                    {l.status === 'active' && act(sess, l.id, 'sold', 'ขาย/เช่าแล้ว', 'btn-gold')}
                    {['active', 'expired'].includes(l.status) && act(sess, l.id, 'renew', 'ต่ออายุ', 'btn-line')}
                    {!['closed', 'sold'].includes(l.status) && act(sess, l.id, 'close', 'ปิดประกาศ', 'btn-line', 'ยืนยันปิดประกาศนี้?')}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ))}

    {tab === 'leads' && (
      <div class="table-wrap"><table class="t"><thead><tr><th>วันที่</th><th>ประกาศ</th><th>ผู้สนใจ</th><th>ข้อความ</th></tr></thead><tbody>
        {leads.length === 0 && <tr><td colspan={4} class="muted center" style="padding:32px">ยังไม่มีผู้สนใจ</td></tr>}
        {leads.map((d) => <tr><td class="nowrap small">{thaiDateTime(d.createdAt)}</td><td class="nowrap">{d.listingRef}</td><td><b>{d.name}</b><div class="small"><a href={`tel:${d.phone}`}>{d.phone}</a>{d.line ? ` · LINE ${d.line}` : ''}</div></td><td class="small">{d.message}</td></tr>)}
      </tbody></table></div>
    )}

    {tab === 'profile' && (
      <div class="grid2" style="gap:20px;align-items:start">
        <form class="form-card" method="post" action="/account/profile">
          <h2 style="font-size:19px">ข้อมูลติดต่อ</h2>
          <input type="hidden" name="csrf" value={sess.csrf} />
          <div class="field"><label>อีเมล</label><input class="input" value={user.email} disabled /><div class="hint">{user.emailVerifiedAt ? `ยืนยันแล้วเมื่อ ${thaiDate(user.emailVerifiedAt)}` : 'ยังไม่ยืนยัน'}</div></div>
          <div class="field"><label for="p-n">ชื่อ</label><input id="p-n" class="input" name="name" required maxlength={80} value={user.name} /></div>
          <div class="field"><label for="p-ph">เบอร์โทร</label><input id="p-ph" class="input" name="phone" required maxlength={15} value={user.phone || ''} /></div>
          <div class="field"><label for="p-ln">LINE ID</label><input id="p-ln" class="input" name="line" maxlength={60} value={user.line || ''} /></div>
          <button class="btn btn-ink" type="submit">บันทึก</button>
        </form>
        <form class="form-card" method="post" action="/account/password">
          <h2 style="font-size:19px">เปลี่ยนรหัสผ่าน</h2>
          <input type="hidden" name="csrf" value={sess.csrf} />
          <div class="field"><label for="pw-c">รหัสผ่านปัจจุบัน</label><input id="pw-c" class="input" type="password" name="current" required autocomplete="current-password" /></div>
          <div class="field"><label for="pw-n">รหัสผ่านใหม่</label><input id="pw-n" class="input" type="password" name="next" required minlength={8} autocomplete="new-password" /></div>
          <div class="field"><label for="pw-n2">ยืนยันรหัสผ่านใหม่</label><input id="pw-n2" class="input" type="password" name="next2" required minlength={8} autocomplete="new-password" /></div>
          <button class="btn btn-ink" type="submit">เปลี่ยนรหัสผ่าน</button>
        </form>
      </div>
    )}
  </div>
);

function act(sess: UserSession, id: number, action: string, label: string, cls: string, confirm?: string) {
  return (
    <form method="post" action={`/account/listings/${id}`} data-confirm={confirm}>
      <input type="hidden" name="csrf" value={sess.csrf} /><input type="hidden" name="action" value={action} />
      <button class={`btn btn-sm ${cls}`} type="submit">{label}</button>
    </form>
  );
}
