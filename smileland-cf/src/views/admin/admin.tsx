/** @jsxImportSource hono/jsx */
import type { Child, FC } from 'hono/jsx';
import { raw } from 'hono/html';
import type { Bindings, AdminSession } from '../../env';
import type { Lead, Listing } from '../../db/schema';
import { ASSET_V, Brand, Icon, StatusBadge } from '../ui';
import { DEALS, DEED_TYPES, FEATURES, TYPES, ZONING, formatPrice, landText, thaiDateTime, type Deal, type PType } from '../../lib/util';
import { imgUrl, placeholder } from '../../lib/listings';
import { TL_LABEL } from '../pages/listing';

export const AdminLayout: FC<{ title: string; admin?: AdminSession; nav?: string; counts?: { pending: number; leads: number }; children?: Child }> = ({ title, admin, nav, counts, children }) => (
  <>
    {raw('<!doctype html>')}
    <html lang="th">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex, nofollow" />
        <title>{title} · SMILELAND Admin</title>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="stylesheet" href={`/assets/css/fonts.css?v=${ASSET_V}`} />
        <link rel="stylesheet" href={`/assets/css/site.css?v=${ASSET_V}`} />
      </head>
      <body class="admin-body" data-page="admin">
        {admin ? (
          <div class="admin-shell">
            <aside class="admin-side">
              <Brand sub={false} />
              <nav>
                <a href="/admin" class={nav === 'dash' ? 'on' : ''}>ภาพรวม</a>
                <a href="/admin/listings?status=pending" class={nav === 'pending' ? 'on' : ''}>รอตรวจสอบ {counts?.pending ? <span class="n">{counts.pending}</span> : null}</a>
                <a href="/admin/listings" class={nav === 'listings' ? 'on' : ''}>ประกาศทั้งหมด</a>
                <a href="/admin/leads" class={nav === 'leads' ? 'on' : ''}>ผู้สนใจ / ฝากขาย {counts?.leads ? <span class="n">{counts.leads}</span> : null}</a>
                <a href="/admin/settings" class={nav === 'settings' ? 'on' : ''}>ตั้งค่าเว็บไซต์</a>
                <a href="/admin/users" class={nav === 'users' ? 'on' : ''}>ผู้ดูแลระบบ</a>
                <a href="/admin/password" class={nav === 'password' ? 'on' : ''}>เปลี่ยนรหัสผ่าน</a>
                <a href="/" target="_blank">ดูหน้าเว็บ ↗</a>
              </nav>
              <form method="post" action="/admin/logout" style="margin-top:24px;padding:0 8px">
                <input type="hidden" name="csrf" value={admin.csrf} />
                <div class="tiny" style="color:#9fb0c4;margin-bottom:8px">เข้าสู่ระบบ: {admin.username}</div>
                <button class="btn btn-line btn-sm" type="submit">ออกจากระบบ</button>
              </form>
            </aside>
            <main class="admin-main">{children}</main>
          </div>
        ) : children}
        <script src={`/assets/js/app.js?v=${ASSET_V}`} defer></script>
      </body>
    </html>
  </>
);

export const LoginPage: FC<{ env: Bindings; error?: string }> = ({ env, error }) => (
  <div class="login-wrap">
    <form class="login-card" method="post" action="/admin/login">
      <div style="margin-bottom:22px"><Brand sub={false} /></div>
      <h1 style="font-size:24px">เข้าสู่ระบบผู้ดูแล</h1>
      {error && <div class="alert alert-bad">{error}</div>}
      <div class="field"><label for="a-user">ชื่อผู้ใช้</label><input id="a-user" class="input" name="username" required autocomplete="username" maxlength={40} /></div>
      <div class="field"><label for="a-pass">รหัสผ่าน</label><input id="a-pass" class="input" type="password" name="password" required autocomplete="current-password" maxlength={200} /></div>
      <div class="cf-turnstile" data-sitekey={env.TURNSTILE_SITE_KEY} data-language="th" style="margin-bottom:14px"></div>
      <button class="btn btn-ink btn-block" type="submit">เข้าสู่ระบบ</button>
      <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
    </form>
  </div>
);

export const PasswordPage: FC<{ admin: AdminSession; error?: string; ok?: string; forced?: boolean }> = ({ admin, error, ok, forced }) => (
  <>
    <h1>เปลี่ยนรหัสผ่าน</h1>
    {forced && <div class="alert alert-warn">เข้าสู่ระบบครั้งแรก กรุณาตั้งรหัสผ่านใหม่ก่อนใช้งาน</div>}
    {error && <div class="alert alert-bad">{error}</div>}
    {ok && <div class="alert alert-ok">{ok}</div>}
    <form class="form-card" method="post" action="/admin/password" style="max-width:520px">
      <input type="hidden" name="csrf" value={admin.csrf} />
      <div class="field"><label for="pw-cur">รหัสผ่านปัจจุบัน</label><input id="pw-cur" class="input" type="password" name="current" required autocomplete="current-password" /></div>
      <div class="field"><label for="pw-new">รหัสผ่านใหม่</label><input id="pw-new" class="input" type="password" name="next" required minlength={10} autocomplete="new-password" /><div class="hint">อย่างน้อย 10 ตัวอักษร</div></div>
      <div class="field"><label for="pw-new2">ยืนยันรหัสผ่านใหม่</label><input id="pw-new2" class="input" type="password" name="next2" required minlength={10} autocomplete="new-password" /></div>
      <button class="btn btn-ink" type="submit">บันทึก</button>
    </form>
  </>
);

export const Dashboard: FC<{ k: Record<string, number>; recent: (Listing & { provinceName?: string })[]; leads: Lead[] }> = ({ k, recent, leads }) => (
  <>
    <h1>ภาพรวม</h1>
    <div class="kpis">
      <div class="kpi"><span>รอตรวจสอบ</span><b>{formatPrice(k.pending)}</b></div>
      <div class="kpi"><span>เผยแพร่อยู่</span><b>{formatPrice(k.active)}</b></div>
      <div class="kpi"><span>ปิดการขาย/เช่า</span><b>{formatPrice(k.sold)}</b></div>
      <div class="kpi"><span>ผู้สนใจใหม่</span><b>{formatPrice(k.leadsNew)}</b></div>
      <div class="kpi"><span>ขอฝากขาย</span><b>{formatPrice(k.consign)}</b></div>
      <div class="kpi"><span>ประกาศ 7 วันล่าสุด</span><b>{formatPrice(k.week)}</b></div>
    </div>
    <div class="section-head"><h2 style="font-size:20px">ประกาศล่าสุด</h2><a class="btn btn-line btn-sm" href="/admin/listings">ดูทั้งหมด</a></div>
    <ListingTable rows={recent} />
    <div class="section-head" style="margin-top:28px"><h2 style="font-size:20px">ผู้สนใจล่าสุด</h2><a class="btn btn-line btn-sm" href="/admin/leads">ดูทั้งหมด</a></div>
    <LeadTable rows={leads} />
  </>
);

export const ListingTable: FC<{ rows: (Listing & { provinceName?: string })[]; env?: Bindings }> = ({ rows, env }) => (
  <div class="table-wrap">
    <table class="t">
      <thead><tr><th></th><th>รหัส / หัวข้อ</th><th>ประเภท</th><th>ราคา</th><th>จังหวัด</th><th>สถานะ</th><th>ส่งเมื่อ</th></tr></thead>
      <tbody>
        {rows.length === 0 && <tr><td colspan={7} class="muted center" style="padding:30px">ไม่มีรายการ</td></tr>}
        {rows.map((l) => (
          <tr>
            <td class="thumbcell"><img src={(env && imgUrl(env, l.coverKey, 400)) || placeholder(l.type)} alt="" loading="lazy" /></td>
            <td><a href={`/admin/listings/${l.id}`}><b>{l.ref}</b></a>{l.featured ? <span class="badge b-feat" style="margin-left:6px">แนะนำ</span> : null}{l.consign ? <span class="badge b-sold" style="margin-left:6px">ฝากขาย</span> : null}<div class="small">{l.title}</div></td>
            <td class="nowrap">{TYPES[l.type as PType]}{DEALS[l.deal as Deal]}</td>
            <td class="nowrap">฿{formatPrice(l.price)}</td>
            <td class="nowrap">{l.provinceName}</td>
            <td><StatusBadge s={l.status} /></td>
            <td class="nowrap small">{thaiDateTime(l.createdAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const LeadTable: FC<{ rows: (Lead & { listingRef?: string | null })[]; csrf?: string }> = ({ rows, csrf }) => (
  <div class="table-wrap">
    <table class="t">
      <thead><tr><th>วันที่</th><th>ประเภท</th><th>ชื่อ / ติดต่อ</th><th>ข้อความ</th><th>สถานะ</th></tr></thead>
      <tbody>
        {rows.length === 0 && <tr><td colspan={5} class="muted center" style="padding:30px">ไม่มีรายการ</td></tr>}
        {rows.map((d) => {
          let meta: Record<string, string> = {};
          try { meta = JSON.parse(d.meta || '{}'); } catch { /* ignore */ }
          return (
            <tr>
              <td class="nowrap small">{thaiDateTime(d.createdAt)}</td>
              <td class="nowrap">{d.kind === 'inquiry' ? 'สนใจทรัพย์' : d.kind === 'consign' ? 'ฝากขาย/เช่า' : 'ติดต่อ'}{d.listingId ? <div class="small"><a href={`/admin/listings/${d.listingId}`}>{d.listingRef || `#${d.listingId}`}</a></div> : null}</td>
              <td><b>{d.name}</b><div class="small"><a href={`tel:${d.phone}`}>{d.phone}</a>{d.line ? ` · LINE ${d.line}` : ''}</div></td>
              <td class="small" style="max-width:380px">{d.message}{Object.keys(meta).length ? <div class="tiny muted">{Object.entries(meta).map(([k, v]) => `${k}: ${v}`).join(' · ')}</div> : null}</td>
              <td>
                {csrf ? (
                  <form method="post" action={`/admin/leads/${d.id}`} style="display:flex;gap:6px">
                    <input type="hidden" name="csrf" value={csrf} />
                    <select class="input" name="status" style="width:auto;padding:6px 30px 6px 10px;font-size:13.5px" data-autosubmit>
                      <option value="new" selected={d.status === 'new'}>ใหม่</option>
                      <option value="contacted" selected={d.status === 'contacted'}>ติดต่อแล้ว</option>
                      <option value="closed" selected={d.status === 'closed'}>ปิดแล้ว</option>
                    </select>
                  </form>
                ) : <span class="badge b-pending">{d.status}</span>}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

export const ListingsAdminPage: FC<{ env: Bindings; rows: (Listing & { provinceName?: string })[]; status: string; q: string; page: number; pages: number; total: number }> = ({ env, rows, status, q, page, pages, total }) => (
  <>
    <h1>{status === 'pending' ? 'รอตรวจสอบ' : 'ประกาศทั้งหมด'} <span class="muted" style="font-size:16px">({formatPrice(total)})</span></h1>
    <form class="toolbar" method="get">
      <select class="input" name="status" data-autosubmit>
        {[['', 'ทุกสถานะ'], ['pending', 'รอตรวจสอบ'], ['active', 'เผยแพร่'], ['rejected', 'ไม่อนุมัติ'], ['sold', 'ปิดการขาย'], ['expired', 'หมดอายุ'], ['closed', 'ปิดประกาศ']].map(([v, t]) => <option value={v} selected={status === v}>{t}</option>)}
      </select>
      <input class="input" name="q" value={q} placeholder="ค้นหา รหัส / หัวข้อ / เบอร์" />
      <button class="btn btn-ink btn-sm" type="submit">ค้นหา</button>
    </form>
    <ListingTable rows={rows} env={env} />
    {pages > 1 && <nav class="pager">{Array.from({ length: pages }, (_, i) => i + 1).slice(0, 50).map((n) => n === page ? <span class="on">{n}</span> : <a href={`?status=${status}&q=${encodeURIComponent(q)}&page=${n}`}>{n}</a>)}</nav>}
  </>
);

export const ListingAdminDetail: FC<{
  env: Bindings; admin: AdminSession; l: Listing; images: { keyBase: string; ext: string }[]; loc: string;
  timeline: { event: string; note: string | null; actor: string; createdAt: number }[]; leads: Lead[]; msg?: string;
}> = ({ env, admin, l, images, loc, timeline, leads, msg }) => {
  let feats: string[] = [];
  try { feats = JSON.parse(l.features || '[]'); } catch { /* ignore */ }
  const act = (action: string, label: string, cls: string, extra?: Child, confirm?: string) => (
    <form method="post" action={`/admin/listings/${l.id}`} data-confirm={confirm} style="display:inline-flex;gap:8px;align-items:center;flex-wrap:wrap">
      <input type="hidden" name="csrf" value={admin.csrf} />
      <input type="hidden" name="action" value={action} />
      {extra}
      <button class={`btn btn-sm ${cls}`} type="submit">{label}</button>
    </form>
  );
  return (
    <>
      <p><a href="/admin/listings" class="small">← กลับรายการ</a></p>
      <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center">
        <h1 style="margin:0">{l.ref}</h1>
        <div style="display:flex;gap:8px;align-items:center"><StatusBadge s={l.status} />{l.status === 'active' && <a class="btn btn-line btn-sm" href={`/listing/${l.id}`} target="_blank">ดูหน้าเว็บ ↗</a>}</div>
      </div>
      {msg && <div class="alert alert-ok" style="margin-top:14px">{msg}</div>}
      <div class="form-card" style="margin-top:18px">
        <h2 style="font-size:18px">การดำเนินการ</h2>
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
          {l.status !== 'active' && !['sold'].includes(l.status) && act('approve', '✓ อนุมัติและเผยแพร่', 'btn-ok')}
          {l.status === 'pending' && act('reject', 'ไม่อนุมัติ', 'btn-danger', <input class="input" name="reason" required placeholder="เหตุผล (แจ้งผู้ลงประกาศ)" style="width:260px" maxlength={300} />)}
          {l.status === 'active' && act(l.featured ? 'unfeature' : 'feature', l.featured ? 'ยกเลิกแนะนำ' : '★ ตั้งเป็นประกาศแนะนำ', 'btn-gold')}
          {l.status === 'active' && act('sold', 'ปิดการขาย/เช่า', 'btn-line')}
          {!['closed'].includes(l.status) && act('close', 'ปิดประกาศ', 'btn-line', undefined, 'ยืนยันปิดประกาศนี้?')}
        </div>
      </div>
      <div class="grid2" style="gap:20px;align-items:start">
        <div class="form-card">
          <h2 style="font-size:18px">ข้อมูลประกาศ</h2>
          <dl class="kv">
            <dt>หัวข้อ</dt><dd>{l.title}</dd>
            <dt>ประเภท</dt><dd>{TYPES[l.type as PType]}{DEALS[l.deal as Deal]}</dd>
            <dt>ราคา</dt><dd>฿{formatPrice(l.price)}{l.deal === 'rent' ? '/เดือน' : ''}</dd>
            <dt>ทำเล</dt><dd>{l.addressNote ? `${l.addressNote}, ` : ''}{loc}</dd>
            {l.lat != null && <><dt>พิกัด</dt><dd><a href={`https://www.google.com/maps?q=${l.lat},${l.lng}`} target="_blank" rel="noopener">{l.lat?.toFixed(5)}, {l.lng?.toFixed(5)} ↗</a></dd></>}
            {l.landSqw ? <><dt>ที่ดิน</dt><dd>{landText(l.landSqw)}</dd></> : null}
            {l.usableSqm ? <><dt>พื้นที่ใช้สอย</dt><dd>{l.usableSqm} ตร.ม.</dd></> : null}
            {l.bedrooms != null ? <><dt>ห้องนอน/น้ำ</dt><dd>{l.bedrooms} / {l.bathrooms ?? '-'}</dd></> : null}
            {l.projectName ? <><dt>โครงการ</dt><dd>{l.projectName} ชั้น {l.floorNo ?? '-'}</dd></> : null}
            {l.deedType ? <><dt>เอกสารสิทธิ์</dt><dd>{DEED_TYPES[l.deedType]}</dd></> : null}
            {l.zoningColor ? <><dt>ผังเมือง</dt><dd>{ZONING[l.zoningColor]}</dd></> : null}
            {feats.length ? <><dt>จุดเด่น</dt><dd>{feats.map((f) => FEATURES[f] || f).join(', ')}</dd></> : null}
          </dl>
          <h3 style="font-size:15px;margin-top:16px">รายละเอียด</h3>
          <div class="prose small">{l.description}</div>
        </div>
        <div>
          <div class="form-card">
            <h2 style="font-size:18px">ผู้ลงประกาศ <span class="badge b-pending">ข้อมูลส่วนตัว</span></h2>
            <dl class="kv">
              <dt>ชื่อ</dt><dd>{l.ownerName} ({l.posterRole === 'agent' ? 'นายหน้า' : 'เจ้าของ'})</dd>
              <dt>โทร</dt><dd><a href={`tel:${l.ownerPhone}`}>{l.ownerPhone}</a></dd>
              {l.ownerLine && <><dt>LINE</dt><dd>{l.ownerLine}</dd></>}
              {l.ownerEmail && <><dt>อีเมล</dt><dd>{l.ownerEmail}</dd></>}
              {l.deedNo && <><dt>เลขที่โฉนด</dt><dd>{l.deedNo}</dd></>}
              <dt>ฝากขาย</dt><dd>{l.consign ? 'สนใจบริการฝากขาย/ฝากเช่า' : '-'}</dd>
            </dl>
          </div>
          <div class="form-card">
            <h2 style="font-size:18px">แก้ไขราคา</h2>
            {act('price', 'บันทึก', 'btn-ink', <input class="input" name="price" data-money value={formatPrice(l.price)} style="width:200px" />)}
          </div>
        </div>
      </div>
      <div class="form-card">
        <h2 style="font-size:18px">รูปภาพ ({images.length})</h2>
        <div class="thumbs">{images.map((im, i) => <a class="thumb" href={imgUrl(env, `${im.keyBase}:${im.ext}`, 1600)!} target="_blank"><img src={imgUrl(env, `${im.keyBase}:${im.ext}`, 400)!} alt="" />{i === 0 && <span class="cover">ปก</span>}</a>)}</div>
        {images.length === 0 && <p class="muted">ไม่มีรูปภาพ</p>}
      </div>
      <div class="form-card">
        <h2 style="font-size:18px">ผู้สนใจ ({leads.length})</h2>
        <LeadTable rows={leads} csrf={admin.csrf} />
      </div>
      <div class="form-card">
        <h2 style="font-size:18px">จดหมายเหตุ</h2>
        <ul class="tl">{timeline.map((t) => <li><time>{thaiDateTime(t.createdAt)} · {t.actor}</time>{TL_LABEL[t.event] || t.event}{t.note ? ` — ${t.note}` : ''}</li>)}</ul>
      </div>
    </>
  );
};

export const LeadsAdminPage: FC<{ rows: (Lead & { listingRef?: string | null })[]; status: string; kind: string; csrf: string }> = ({ rows, status, kind, csrf }) => (
  <>
    <h1>ผู้สนใจ / ขอฝากขาย</h1>
    <form class="toolbar" method="get">
      <select class="input" name="kind" data-autosubmit>{[['', 'ทุกประเภท'], ['inquiry', 'สนใจทรัพย์'], ['consign', 'ฝากขาย/เช่า'], ['contact', 'ติดต่อ']].map(([v, t]) => <option value={v} selected={kind === v}>{t}</option>)}</select>
      <select class="input" name="status" data-autosubmit>{[['', 'ทุกสถานะ'], ['new', 'ใหม่'], ['contacted', 'ติดต่อแล้ว'], ['closed', 'ปิดแล้ว']].map(([v, t]) => <option value={v} selected={status === v}>{t}</option>)}</select>
    </form>
    <LeadTable rows={rows} csrf={csrf} />
  </>
);

export const SettingsPage: FC<{ admin: AdminSession; s: Record<string, string>; ok?: string; after?: string }> = ({ admin, s, ok, after }) => {
  const fields: [string, string, string?][] = [
    ['contact_phone', 'เบอร์โทรติดต่อ (แสดงบนเว็บ)'], ['contact_line', 'LINE OA ID (เช่น @smileland)'], ['contact_line_url', 'ลิงก์ LINE OA', 'https://lin.ee/...'],
    ['contact_email', 'อีเมลติดต่อ / เรื่องข้อมูลส่วนบุคคล'], ['company_name', 'ชื่อนิติบุคคล/ผู้ให้บริการ (นโยบายความเป็นส่วนตัว)'],
    ['company_address', 'ที่อยู่'], ['dpo_contact', 'เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล (DPO)'], ['privacy_effective_date', 'วันที่นโยบายมีผล', 'เช่น 1 พฤศจิกายน 2569'],
    ['data_retention', 'ระยะเวลาเก็บข้อมูล'],
  ];
  return (
    <>
      <h1>ตั้งค่าเว็บไซต์</h1>
      {ok && <div class="alert alert-ok">{ok}</div>}
      <form class="form-card" method="post" action="/admin/settings" style="max-width:760px">
        <input type="hidden" name="csrf" value={admin.csrf} />
        {fields.map(([k, label, ph]) => <div class="field"><label for={`s-${k}`}>{label}</label><input id={`s-${k}`} class="input" name={k} value={s[k] || ''} placeholder={ph || ''} maxlength={300} /></div>)}
        <p class="small muted">ข้อมูลส่วนนี้แสดงบนหน้าเว็บ (หัวเว็บ ท้ายเว็บ และหน้านโยบายความเป็นส่วนตัว) ควรให้นักกฎหมายตรวจทานก่อนเปิดใช้จริง</p>
        <button class="btn btn-ink" type="submit">บันทึก</button>
      </form>
      <form class="form-card" method="post" action="/admin/reindex" style="max-width:760px">
        <input type="hidden" name="csrf" value={admin.csrf} />
        <input type="hidden" name="after" value={after || '0'} />
        <h2 style="font-size:18px">ดัชนีค้นหาภาษาไทย</h2>
        <p class="small muted">ระบบสร้างดัชนีให้อัตโนมัติเมื่ออนุมัติประกาศ ใช้ปุ่มนี้หลังนำเข้าข้อมูลจากระบบเดิม หรือเมื่อปรับวิธีตัดคำ (ทำครั้งละ 200 ประกาศ)</p>
        <button class="btn btn-line" type="submit">{after ? 'ทำต่อ' : 'สร้างดัชนีค้นหาใหม่'}</button>
      </form>
    </>
  );
};

export const UsersPage: FC<{ admin: AdminSession; users: { id: number; username: string; createdAt: number; lastLoginAt: number | null; mustChange: number }[]; ok?: string; error?: string }> = ({ admin, users, ok, error }) => (
  <>
    <h1>ผู้ดูแลระบบ</h1>
    {ok && <div class="alert alert-ok">{ok}</div>}
    {error && <div class="alert alert-bad">{error}</div>}
    <div class="table-wrap" style="margin-bottom:22px"><table class="t"><thead><tr><th>ชื่อผู้ใช้</th><th>สร้างเมื่อ</th><th>เข้าสู่ระบบล่าสุด</th><th></th></tr></thead><tbody>
      {users.map((u) => <tr><td><b>{u.username}</b>{u.mustChange ? <span class="badge b-pending" style="margin-left:6px">รอเปลี่ยนรหัส</span> : null}</td><td class="small">{thaiDateTime(u.createdAt)}</td><td class="small">{thaiDateTime(u.lastLoginAt)}</td><td>
        {u.id !== admin.adminId && <form method="post" action="/admin/users" data-confirm={`ลบผู้ดูแล ${u.username}?`}><input type="hidden" name="csrf" value={admin.csrf} /><input type="hidden" name="action" value="delete" /><input type="hidden" name="id" value={String(u.id)} /><button class="btn btn-line btn-sm">ลบ</button></form>}
      </td></tr>)}
    </tbody></table></div>
    <form class="form-card" method="post" action="/admin/users" style="max-width:520px">
      <h2 style="font-size:18px">เพิ่มผู้ดูแล</h2>
      <input type="hidden" name="csrf" value={admin.csrf} /><input type="hidden" name="action" value="create" />
      <div class="field"><label>ชื่อผู้ใช้</label><input class="input" name="username" required pattern="[a-z0-9._-]{3,30}" maxlength={30} /><div class="hint">a-z 0-9 . _ - (3–30 ตัว)</div></div>
      <div class="field"><label>รหัสผ่านชั่วคราว</label><input class="input" type="password" name="password" required minlength={10} autocomplete="new-password" /><div class="hint">ผู้ดูแลใหม่ต้องเปลี่ยนรหัสเมื่อเข้าสู่ระบบครั้งแรก · ส่งรหัสผ่านทางช่องทางส่วนตัวเท่านั้น</div></div>
      <button class="btn btn-ink" type="submit">เพิ่มผู้ดูแล</button>
    </form>
  </>
);

export { Icon };
