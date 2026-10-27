/** @jsxImportSource hono/jsx */
import type { Child, FC } from 'hono/jsx';
import { raw } from 'hono/html';
import type { Bindings, AdminSession } from '../../env';
import type { Admin, Lead, Listing, User } from '../../db/schema';
import { outbox } from '../../db/schema';
import { PERMS, can } from '../../lib/users';
import { ASSET_V, Brand, Icon, StatusBadge } from '../ui';
import { DEALS, DEED_TYPES, FEATURES, TYPES, ZONING, formatPrice, landText, thaiDate, thaiDateTime, type Deal, type PType } from '../../lib/util';
import { imgUrl, placeholder, ZONES, type ZoneKey } from '../../lib/listings';
import { TL_LABEL } from '../pages/listing';

export const AdminLayout: FC<{ title: string; admin?: AdminSession; nav?: string; counts?: { pending: number; leads: number }; children?: Child }> = ({ title, admin, nav, counts, children }) => (
  <>
    {raw('<!doctype html>')}
    <html lang="th">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex, nofollow" />
        <title>{title} · อีสานน่าอยู่ Admin</title>
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
                {can(admin, 'listings.review') && <a href="/admin/listings?status=pending" class={nav === 'pending' ? 'on' : ''}>รอตรวจสอบ {counts?.pending ? <span class="n">{counts.pending}</span> : null}</a>}
                {(can(admin, 'listings.review') || can(admin, 'listings.edit')) && <a href="/admin/listings" class={nav === 'listings' ? 'on' : ''}>ประกาศทั้งหมด</a>}
                {can(admin, 'listings.edit') && <a href="/admin/zones" class={nav === 'zones' ? 'on' : ''}>จัดโซนหน้าแรก</a>}
                {can(admin, 'leads') && <a href="/admin/leads" class={nav === 'leads' ? 'on' : ''}>ผู้สนใจ / ฝากขาย {counts?.leads ? <span class="n">{counts.leads}</span> : null}</a>}
                {can(admin, 'members') && <a href="/admin/members" class={nav === 'members' ? 'on' : ''}>สมาชิก</a>}
                {can(admin, 'members') && <a href="/admin/outbox" class={nav === 'outbox' ? 'on' : ''}>กล่องอีเมลขาออก</a>}
                {can(admin, 'settings') && <a href="/admin/settings" class={nav === 'settings' ? 'on' : ''}>ตั้งค่าเว็บไซต์</a>}
                {can(admin, 'staff') && <a href="/admin/users" class={nav === 'users' ? 'on' : ''}>ทีมผู้ดูแล & สิทธิ์</a>}
                <a href="/admin/password" class={nav === 'password' ? 'on' : ''}>เปลี่ยนรหัสผ่าน</a>
                <a href="/" target="_blank">ดูหน้าเว็บ ↗</a>
              </nav>
              <form method="post" action="/admin/logout" style="margin-top:24px;padding:0 8px">
                <input type="hidden" name="csrf" value={admin.csrf} />
                <div class="tiny" style="color:#9fb0c4;margin-bottom:8px">เข้าสู่ระบบ: {admin.username}{admin.isOwner ? ' (เจ้าของระบบ)' : ''}</div>
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

export const LoginPage: FC<{ env: Bindings; error?: string; username?: string }> = ({ env, error, username }) => (
  <div class="login-wrap">
    <form class="login-card" method="post" action="/admin/login">
      <div style="margin-bottom:20px"><Brand sub={false} /></div>
      <h1 style="font-size:24px">เข้าสู่ระบบผู้ดูแล</h1>
      {error && <div class="alert alert-bad">{error}</div>}
      <div class="field"><label for="a-user">ชื่อผู้ใช้หรืออีเมลผู้ดูแล</label><input id="a-user" class="input" name="username" value={username || ''} required autocomplete="username" autocapitalize="none" spellcheck={false} maxlength={40} /></div>
      <div class="field"><label for="a-pass">รหัสผ่าน</label><input id="a-pass" class="input" type="password" name="password" required autocomplete="current-password" maxlength={200} /></div>
      <div class="cf-turnstile" data-sitekey={env.TURNSTILE_SITE_KEY} data-language="th" style="margin-bottom:12px"></div>
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
    <div class="section-head" style="margin-top:24px"><h2 style="font-size:20px">ผู้สนใจล่าสุด</h2><a class="btn btn-line btn-sm" href="/admin/leads">ดูทั้งหมด</a></div>
    <LeadTable rows={leads} />
  </>
);

export const ListingTable: FC<{ rows: (Listing & { provinceName?: string })[]; env?: Bindings }> = ({ rows, env }) => (
  <div class="table-wrap">
    <table class="t">
      <thead><tr><th></th><th>รหัส / หัวข้อ</th><th>ประเภท</th><th>ราคา</th><th>จังหวัด</th><th>สถานะ</th><th>ส่งเมื่อ</th></tr></thead>
      <tbody>
        {rows.length === 0 && <tr><td colspan={7} class="muted center" style="padding:32px">ไม่มีรายการ</td></tr>}
        {rows.map((l) => (
          <tr>
            <td class="thumbcell"><img src={(env && imgUrl(env, l.coverKey, 400)) || placeholder(l.type)} alt="" loading="lazy" /></td>
            <td><a href={`/admin/listings/${l.id}`}><b>{l.ref}</b></a>{l.zone || l.featured ? <span class="badge b-feat" style="margin-left:4px">{l.zone ? `โซน ${l.zone}` : 'แนะนำ'}</span> : null}{l.revision ? <span class="badge b-pending" style="margin-left:4px">ส่งแก้ไขครั้งที่ {l.revision}</span> : null}{l.deletedAt ? <span class="badge b-rejected" style="margin-left:4px">ผู้โพสต์ลบแล้ว</span> : null}{l.consign ? <span class="badge b-sold" style="margin-left:4px">ฝากขาย</span> : null}<div class="small">{l.title}</div></td>
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
        {rows.length === 0 && <tr><td colspan={5} class="muted center" style="padding:32px">ไม่มีรายการ</td></tr>}
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
                  <form method="post" action={`/admin/leads/${d.id}`} style="display:flex;gap:4px">
                    <input type="hidden" name="csrf" value={csrf} />
                    <select class="input" name="status" style="width:auto;padding:4px 32px 4px 8px;font-size:13.5px" data-autosubmit>
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
      {msg && <div class="alert alert-ok" style="margin-top:12px">{msg}</div>}
      {l.deletedAt ? <div class="alert alert-bad" style="margin-top:12px">ผู้โพสต์ลบประกาศนี้แล้วเมื่อ {thaiDateTime(l.deletedAt)} — ไม่แสดงในบัญชีผู้โพสต์และหน้าเว็บ</div> : null}
      {l.revision > 0 && l.status === 'pending' && (() => {
        const prev = [...timeline].reverse().find((t) => t.event === 'rejected');
        return <div class="alert alert-warn" style="margin-top:12px"><b>ผู้โพสต์แก้ไขแล้วส่งตรวจใหม่ (ครั้งที่ {l.revision})</b>{prev?.note ? <> — เหตุผลที่ไม่อนุมัติครั้งก่อน: “{prev.note}”</> : null}</div>;
      })()}
      <div class="form-card" style="margin-top:16px">
        <h2 style="font-size:18px">การดำเนินการ</h2>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          {can(admin, 'listings.review') && l.status !== 'active' && !['sold'].includes(l.status) && act('approve', '✓ อนุมัติและเผยแพร่', 'btn-ok')}
          {can(admin, 'listings.review') && l.status === 'pending' && act('reject', 'ไม่อนุมัติ', 'btn-danger', <input class="input" name="reason" required placeholder="เหตุผล (แจ้งผู้ลงประกาศ)" style="width:260px" maxlength={300} />)}
          {can(admin, 'listings.edit') && l.status === 'active' && act('sold', 'ปิดการขาย/เช่า', 'btn-line')}
          {can(admin, 'listings.edit') && !['closed'].includes(l.status) && act('close', 'ปิดประกาศ', 'btn-line', undefined, 'ยืนยันปิดประกาศนี้?')}
        </div>
      </div>
      {can(admin, 'listings.edit') && l.status === 'active' && <ZoneForm admin={admin} l={l} />}
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
          {can(admin, 'listings.edit') && <div class="form-card">
            <h2 style="font-size:18px">แก้ไขราคา</h2>
            {act('price', 'บันทึก', 'btn-ink', <input class="input" name="price" data-money value={formatPrice(l.price)} style="width:200px" />)}
          </div>}
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

const zoneLeft = (until: number | null) => {
  if (!until) return 'ไม่กำหนดเวลา';
  const d = Math.ceil((until - Date.now() / 1000) / 86400);
  return d > 0 ? `เหลือ ${d} วัน (ถึง ${thaiDate(until)})` : `หมดเวลาแล้ว (${thaiDate(until)})`;
};

export const ZoneForm: FC<{ admin: AdminSession; l: Pick<Listing, 'id' | 'zone' | 'zoneOrder' | 'zoneUntil' | 'featured'>; back?: string; compact?: boolean }> = ({ admin, l, back, compact }) => {
  const cur = (l.zone || (l.featured ? 'B' : '')) as ZoneKey | '';
  return (
    <form method="post" action={`/admin/listings/${l.id}`} class={compact ? 'zone-form compact' : 'form-card zone-form'}>
      <input type="hidden" name="csrf" value={admin.csrf} />
      <input type="hidden" name="action" value="zone" />
      {back && <input type="hidden" name="back" value={back} />}
      {!compact && <h2 style="font-size:18px">ตำแหน่งแสดงผลหน้าแรก</h2>}
      {!compact && <div class="zone-pick">
        {([['', 'ปกติ', 'แสดงตามลำดับเวลาเหมือนประกาศทั่วไป'], ...(Object.keys(ZONES) as ZoneKey[]).map((k) => [k, ZONES[k].label, ZONES[k].where + (ZONES[k].max ? ` · สูงสุด ${ZONES[k].max} ช่อง` : '')])] as [string, string, string][]).map(([k, t, d]) => (
          <label class={`zone-opt z-${k || 'none'}`}><input type="radio" name="zone" value={k} checked={cur === k} /><span><b>{t}</b><small>{d}</small></span></label>
        ))}
      </div>}
      {compact && <input type="hidden" name="zone" value={cur} />}
      <div class="zone-row">
        <label>ลำดับ <input class="input" name="order" type="number" min="0" max="99" value={String(l.zoneOrder || 0)} style="width:80px" /></label>
        <label>ระยะเวลา <select class="input" name="days">
          {l.zone && l.zoneUntil ? <option value="keep" selected>คงเดิม</option> : null}
          <option value="0">ไม่กำหนด</option>
          {[7, 15, 30, 60, 90].map((n) => <option value={String(n)}>{n} วัน</option>)}
        </select></label>
        {l.zone && l.zoneUntil ? <span class="small muted">{zoneLeft(l.zoneUntil)}</span> : null}
        <button class="btn btn-sm btn-gold" type="submit">{compact ? 'บันทึก' : 'บันทึกตำแหน่ง'}</button>
      </div>
      {!compact && <p class="small muted" style="margin:8px 0 0">ลำดับน้อยขึ้นก่อน · ครบกำหนดแล้วทรัพย์จะหลุดจากโซนเองอัตโนมัติ</p>}
    </form>
  );
};

type ZRow = { id: number; ref: string; title: string; price: number; deal: string; type: string; coverKey: string | null; provinceName?: string; zone: string | null; zoneOrder: number; zoneUntil: number | null; featured: number };

export const ZonesPage: FC<{ env: Bindings; admin: AdminSession; zones: Record<ZoneKey, ZRow[]>; expired: ZRow[]; ok?: string }> = ({ env, admin, zones, expired, ok }) => {
  const remove = (r: ZRow) => (
    <form method="post" action={`/admin/listings/${r.id}`} style="display:inline">
      <input type="hidden" name="csrf" value={admin.csrf} /><input type="hidden" name="action" value="zone" /><input type="hidden" name="zone" value="" /><input type="hidden" name="back" value="zones" />
      <button class="btn btn-sm btn-line" type="submit">เอาออก</button>
    </form>
  );
  const Slot: FC<{ r?: ZRow; i: number; z: ZoneKey }> = ({ r, i, z }) => r ? (
    <div class={`zslot ${ZONES[z].max && i >= ZONES[z].max ? 'over' : ''}`}>
      <img src={imgUrl(env, r.coverKey, 400) || placeholder(r.type)} alt="" loading="lazy" />
      <div class="zslot-body">
        <div class="small"><b>#{i + 1}</b> · <a href={`/admin/listings/${r.id}`}>{r.ref}</a>{r.ref.startsWith('SL-DEMO') ? ' · ตัวอย่าง' : ''}{ZONES[z].max && i >= ZONES[z].max ? ' · ไม่แสดง (เกินจำนวนช่อง)' : ''}</div>
        <div class="zslot-title">{r.title}</div>
        <div class="small muted">฿{formatPrice(r.price)} · {r.provinceName} · {zoneLeft(r.zoneUntil)}</div>
        <div class="zslot-act"><ZoneForm admin={admin} l={{ ...r, zone: r.zone || (r.featured ? 'B' : null) }} back="zones" compact />{remove(r)}</div>
      </div>
    </div>
  ) : <div class="zslot empty"><span>ช่องว่าง #{i + 1}</span><small>ไปที่ประกาศที่ต้องการ แล้วเลือก "{ZONES[z].label}"</small></div>;
  const block = (z: ZoneKey) => {
    const rows = zones[z];
    const slots = ZONES[z].max ? Math.max(ZONES[z].max, rows.length) : Math.max(rows.length, 1);
    return (
      <section class={`zblock zb-${z}`}>
        <header><span class="ztag">{z}</span><div><h2>{ZONES[z].label}</h2><p>{ZONES[z].where}{ZONES[z].max ? ` · ${rows.length}/${ZONES[z].max} ช่อง` : ` · ${rows.length} รายการ`}</p></div></header>
        <div class={`zslots zs-${z}`}>{Array.from({ length: slots }, (_, i) => (rows[i] || i < (ZONES[z].max || 1)) ? <Slot r={rows[i]} i={i} z={z} /> : null)}</div>
      </section>
    );
  };
  return (
    <>
      <h1>จัดโซนหน้าแรก</h1>
      <p class="muted">ผังตำแหน่งแสดงผลบนเว็บ · เพิ่มทรัพย์เข้าโซนได้จากหน้ารายละเอียดประกาศ (เฉพาะประกาศที่เผยแพร่อยู่)</p>
      {ok && <div class="alert alert-ok">{ok}</div>}
      <div class="zmap">
        <div class="zmap-page">
          <div class="zm-bar">หน้าแรก</div>
          <div class="zm-hero">ภาพหลัก + ช่องค้นหา</div>
          <div class="zm-A">A · โชว์เด่น</div>
          <div class="zm-plain">เลือกตามประเภท</div>
          <div class="zm-B">B · ประกาศแนะนำ</div>
          <div class="zm-plain">ประกาศใหม่</div>
        </div>
        <div class="zmap-page">
          <div class="zm-bar">หน้าค้นหา / จังหวัด</div>
          <div class="zm-plain">ตัวกรอง</div>
          <div class="zm-C">C · ปักหมุดบนสุด</div>
          <div class="zm-plain">ผลค้นหาปกติ</div>
        </div>
      </div>
      {block('A')}{block('B')}{block('C')}
      {expired.length > 0 && <section class="zblock"><header><span class="ztag">⏱</span><div><h2>ครบกำหนดแล้ว</h2><p>หลุดจากโซนอัตโนมัติ ต่อเวลาได้</p></div></header>
        <div class="zslots">{expired.map((r, i) => <Slot r={r} i={i} z={(r.zone || 'B') as ZoneKey} />)}</div></section>}
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

export const SettingsPage: FC<{ admin: AdminSession; s: Record<string, string>; demo: { real: number; demo: number; at: number; hidden: boolean }; ok?: string; after?: string }> = ({ admin, s, demo, ok, after }) => {
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
      <div class="form-card" style="max-width:760px">
        <h2 style="font-size:18px">ประกาศตัวอย่าง</h2>
        <p class="small muted">ประกาศที่ขึ้นต้นด้วย SL-DEMO ใช้แสดงหน้าตาเว็บระหว่างที่ยังมีประกาศจริงน้อย (ติดป้าย "ตัวอย่าง", ไม่ให้ Google เก็บ, ไม่รับการติดต่อ) ประกาศจริงจะแสดงก่อนเสมอ และเมื่อประกาศจริงครบตามจำนวนที่ตั้ง ประกาศตัวอย่างจะหายไปเองทั้งหมด</p>
        <p style="margin:8px 0 14px;display:flex;gap:10px;flex-wrap:wrap;align-items:center">
          <span>ประกาศจริงที่เผยแพร่ <b>{demo.real}</b> / {demo.at}</span>
          <span class="muted">·</span>
          <span>ประกาศตัวอย่าง <b>{demo.demo}</b> รายการ</span>
          {demo.demo > 0 && (demo.hidden ? <span class="badge b-active">ซ่อนแล้ว (ประกาศจริงครบ)</span> : <span class="badge b-pending">กำลังแสดงบนเว็บ</span>)}
        </p>
        <form method="post" action="/admin/demo/threshold" style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;margin-bottom:16px">
          <input type="hidden" name="csrf" value={admin.csrf} />
          <div class="field" style="margin:0;flex:0 0 auto"><label for="demo-at">ซ่อนประกาศตัวอย่างเมื่อมีประกาศจริงครบ (รายการ)</label><input id="demo-at" class="input" name="demo_hide_at" type="number" min={1} max={10000} value={String(demo.at)} style="max-width:160px" /></div>
          <button class="btn btn-ink" type="submit">บันทึก</button>
        </form>
        <form method="post" action="/admin/demo/delete" data-confirm="ลบประกาศตัวอย่าง (SL-DEMO…) ทั้งหมดถาวร? ประกาศจริงจะไม่ถูกลบ">
          <input type="hidden" name="csrf" value={admin.csrf} />
          <button class="btn btn-danger btn-sm" type="submit">ลบประกาศตัวอย่างทั้งหมดถาวร</button>
        </form>
      </div>
    </>
  );
};

const PermChecks: FC<{ perms: string[]; disabled?: boolean; lockStaff?: boolean }> = ({ perms, disabled, lockStaff }) => (
  <div class="chips" style="margin:4px 0 8px">
    {Object.entries(PERMS).map(([k, label]) => (
      <label class="chip" title={label}><input type="checkbox" name={`perm_${k}`} value="1" checked={perms.includes(k)} disabled={disabled || (lockStaff && k === 'staff')} /><span>{label}</span></label>
    ))}
  </div>
);

export const NoPermPage: FC<{ need: string[] }> = ({ need }) => (
  <div class="form-card" style="max-width:620px">
    <h1 style="font-size:22px">ไม่มีสิทธิ์เข้าถึงหน้านี้</h1>
    <p class="muted">ต้องมีสิทธิ์: {need.join(' หรือ ')} — ติดต่อเจ้าของระบบเพื่อขอสิทธิ์</p>
    <a class="btn btn-ink" href="/admin">กลับหน้าภาพรวม</a>
  </div>
);

export const StaffPage: FC<{ admin: AdminSession; staff: Admin[]; ok?: string; error?: string }> = ({ admin, staff, ok, error }) => (
  <>
    <h1>ทีมผู้ดูแล & สิทธิ์</h1>
    <p class="muted">เพิ่มผู้ช่วยทำงาน แล้วเลือกว่าแต่ละคนทำอะไรได้บ้าง · เจ้าของระบบมีทุกสิทธิ์</p>
    {ok && <div class="alert alert-ok">{ok}</div>}
    {error && <div class="alert alert-bad">{error}</div>}
    <div style="display:grid;gap:12px;margin-bottom:24px">
      {staff.map((u) => {
        let perms: string[] = []; try { perms = JSON.parse(u.permissions || '[]'); } catch { /* ignore */ }
        const self = u.id === admin.adminId;
        const locked = !!u.isOwner || self;
        return (
          <div class="form-card" style="margin:0">
            <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center">
              <div><b style="font-size:17px">{u.displayName || u.username}</b> <span class="muted small">@{u.username}</span>
                {u.isOwner ? <span class="badge b-feat" style="margin-left:4px">เจ้าของระบบ</span> : null}
                {self ? <span class="badge b-active" style="margin-left:4px">คุณ</span> : null}
                {u.mustChange ? <span class="badge b-pending" style="margin-left:4px">รอเปลี่ยนรหัส</span> : null}
                <div class="tiny muted">เข้าสู่ระบบล่าสุด: {thaiDateTime(u.lastLoginAt)}</div></div>
            </div>
            {u.isOwner ? <p class="small muted" style="margin:8px 0 0">มีสิทธิ์ทุกอย่าง</p> : (
              <form method="post" action="/admin/users">
                <input type="hidden" name="csrf" value={admin.csrf} /><input type="hidden" name="action" value="perms" /><input type="hidden" name="id" value={String(u.id)} />
                <PermChecks perms={perms} disabled={locked} lockStaff={!admin.isOwner} />
                {!locked && <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
                  <input class="input" name="display_name" value={u.displayName || ''} placeholder="ชื่อที่แสดง" style="width:200px;padding:8px 12px" maxlength={60} />
                  <button class="btn btn-ink btn-sm" type="submit">บันทึกสิทธิ์</button>
                </div>}
              </form>
            )}
            {!locked && (
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;border-top:1px solid var(--line-2);padding-top:8px">
                <form method="post" action="/admin/users" style="display:flex;gap:4px">
                  <input type="hidden" name="csrf" value={admin.csrf} /><input type="hidden" name="action" value="reset" /><input type="hidden" name="id" value={String(u.id)} />
                  <input class="input" type="password" name="password" placeholder="รหัสชั่วคราวใหม่ (≥10)" minlength={10} style="width:200px;padding:8px 12px" autocomplete="new-password" />
                  <button class="btn btn-line btn-sm" type="submit">ตั้งรหัสใหม่</button>
                </form>
                <form method="post" action="/admin/users" data-confirm={`ลบผู้ดูแล ${u.username}?`}>
                  <input type="hidden" name="csrf" value={admin.csrf} /><input type="hidden" name="action" value="delete" /><input type="hidden" name="id" value={String(u.id)} />
                  <button class="btn btn-danger btn-sm" type="submit">ลบ</button>
                </form>
              </div>
            )}
          </div>
        );
      })}
    </div>
    <form class="form-card" method="post" action="/admin/users" style="max-width:760px">
      <h2 style="font-size:18px">+ เพิ่มผู้ช่วย</h2>
      <input type="hidden" name="csrf" value={admin.csrf} /><input type="hidden" name="action" value="create" />
      <div class="grid2">
        <div class="field"><label>ชื่อผู้ใช้ (ใช้ล็อกอิน)</label><input class="input" name="username" required pattern="[a-z0-9._-]{3,30}" maxlength={30} placeholder="เช่น somchai" /><div class="hint">a-z 0-9 . _ - (3–30 ตัว)</div></div>
        <div class="field"><label>ชื่อที่แสดง</label><input class="input" name="display_name" maxlength={60} placeholder="เช่น สมชาย (ทีมตรวจประกาศ)" /></div>
      </div>
      <div class="field"><label>รหัสผ่านชั่วคราว</label><input class="input" type="password" name="password" required minlength={10} autocomplete="new-password" /><div class="hint">ผู้ช่วยต้องเปลี่ยนรหัสเมื่อเข้าครั้งแรก · แจ้งรหัสทางช่องทางส่วนตัวเท่านั้น</div></div>
      <label>สิทธิ์การใช้งาน</label>
      <PermChecks perms={['listings.review', 'leads']} lockStaff={!admin.isOwner} />
      <button class="btn btn-gold" type="submit">เพิ่มผู้ช่วย</button>
    </form>
  </>
);

type MemberRow = User & { listingCount: number };
export const MembersPage: FC<{ admin: AdminSession; rows: MemberRow[]; q: string; status: string; total: number; ok?: string }> = ({ admin, rows, q, status, total, ok }) => (
  <>
    <h1>สมาชิก <span class="muted" style="font-size:16px">({formatPrice(total)})</span></h1>
    {ok && <div class="alert alert-ok">{ok}</div>}
    <form class="toolbar" method="get">
      <input class="input" name="q" value={q} placeholder="ค้นหา อีเมล / ชื่อ / เบอร์" />
      <select class="input" name="status" data-autosubmit>
        {[['', 'ทั้งหมด'], ['unverified', 'ยังไม่ยืนยันอีเมล'], ['suspended', 'ถูกระงับ']].map(([v, t]) => <option value={v} selected={status === v}>{t}</option>)}
      </select>
      <button class="btn btn-ink btn-sm" type="submit">ค้นหา</button>
    </form>
    <div class="table-wrap"><table class="t">
      <thead><tr><th>สมาชิก</th><th>ติดต่อ</th><th>อีเมล</th><th>ประกาศ</th><th>สมัครเมื่อ</th><th>จัดการ</th></tr></thead>
      <tbody>
        {rows.length === 0 && <tr><td colspan={6} class="muted center" style="padding:32px">ไม่มีสมาชิก</td></tr>}
        {rows.map((u) => (
          <tr>
            <td><b>{u.name}</b>{u.status === 'suspended' && <span class="badge b-rejected" style="margin-left:4px">ระงับ</span>}</td>
            <td class="small nowrap"><a href={`tel:${u.phone}`}>{u.phone}</a>{u.line ? <div>LINE {u.line}</div> : null}</td>
            <td class="small">{u.email}<div>{u.emailVerifiedAt ? <span class="badge b-active">ยืนยันแล้ว</span> : <span class="badge b-pending">ยังไม่ยืนยัน</span>}</div></td>
            <td>{u.listingCount ? <a href={`/admin/listings?q=${encodeURIComponent(u.email)}`}>{u.listingCount}</a> : 0}</td>
            <td class="small nowrap">{thaiDate(u.createdAt)}<div class="tiny muted">ล่าสุด {thaiDateTime(u.lastLoginAt)}</div></td>
            <td style="min-width:200px"><div style="display:flex;gap:4px;flex-wrap:wrap">
              {!u.emailVerifiedAt && mAct(admin, u.id, q, 'verify', 'ยืนยันแทน', 'btn-ok')}
              {!u.emailVerifiedAt && mAct(admin, u.id, q, 'resend', 'ส่งลิงก์อีกครั้ง', 'btn-line')}
              {u.status === 'active' ? mAct(admin, u.id, q, 'suspend', 'ระงับ', 'btn-danger', `ระงับบัญชี ${u.email}? สมาชิกจะเข้าสู่ระบบและลงประกาศไม่ได้`) : mAct(admin, u.id, q, 'activate', 'เปิดใช้', 'btn-line')}
            </div></td>
          </tr>
        ))}
      </tbody>
    </table></div>
  </>
);
function mAct(admin: AdminSession, id: number, q: string, action: string, label: string, cls: string, confirm?: string) {
  return (
    <form method="post" action={`/admin/members/${id}`} data-confirm={confirm}>
      <input type="hidden" name="csrf" value={admin.csrf} /><input type="hidden" name="action" value={action} /><input type="hidden" name="q" value={q} />
      <button class={`btn btn-sm ${cls}`} type="submit">{label}</button>
    </form>
  );
}

export const OutboxPage: FC<{ rows: (typeof outbox.$inferSelect)[]; configured: boolean }> = ({ rows, configured }) => (
  <>
    <h1>กล่องอีเมลขาออก</h1>
    {configured ? <div class="alert alert-ok">ตั้งค่าบริการส่งอีเมล (Resend) แล้ว — อีเมลส่งถึงลูกค้าจริง หน้านี้ใช้ดูประวัติ</div> : (
      <div class="alert alert-warn">ยังไม่ได้ตั้งค่าบริการส่งอีเมล — อีเมลจะยังไม่ถึงลูกค้า ใช้ลิงก์ด้านล่างส่งให้ลูกค้าทาง LINE/โทร หรือกด "ยืนยันแทน" ที่หน้าสมาชิก · เมื่อมีโดเมนแล้ว ตั้งค่า RESEND_API_KEY และ MAIL_FROM แล้วอีเมลจะส่งอัตโนมัติ</div>
    )}
    <div class="table-wrap"><table class="t">
      <thead><tr><th>เวลา</th><th>ถึง</th><th>เรื่อง</th><th>ลิงก์</th><th>สถานะ</th></tr></thead>
      <tbody>
        {rows.length === 0 && <tr><td colspan={5} class="muted center" style="padding:32px">ยังไม่มีอีเมล</td></tr>}
        {rows.map((m) => {
          const link = (m.bodyText.match(/https?:\/\/\S+/) || [])[0];
          const expired = m.createdAt < Math.floor(Date.now() / 1000) - (m.kind === 'reset' ? 3600 : 172800);
          return (
            <tr>
              <td class="small nowrap">{thaiDateTime(m.createdAt)}</td>
              <td class="small">{m.toEmail}</td>
              <td class="small">{m.subject}</td>
              <td class="small" style="max-width:360px;word-break:break-all">{link ? (expired ? <span class="muted">หมดอายุแล้ว</span> : <input class="input" readonly value={link} style="font-size:12px;padding:4px 8px" onclick="this.select()" />) : '-'}</td>
              <td><span class={`badge ${m.status === 'sent' ? 'b-active' : m.status === 'failed' ? 'b-rejected' : 'b-pending'}`}>{m.status === 'sent' ? 'ส่งแล้ว' : m.status === 'failed' ? 'ส่งไม่สำเร็จ' : 'ยังไม่ส่ง (รอตั้งค่า)'}</span>{m.error && <div class="tiny muted">{m.error.slice(0, 120)}</div>}</td>
            </tr>
          );
        })}
      </tbody>
    </table></div>
  </>
);

export { Icon };
