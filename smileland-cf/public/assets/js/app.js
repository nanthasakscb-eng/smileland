/* SMILELAND — client script (vanilla, no build step) */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const fmt = (n) => new Intl.NumberFormat('th-TH').format(n);
  const num = (v) => { const n = Number(String(v || '').replace(/,/g, '')); return Number.isFinite(n) ? n : 0; };
  const MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron';
  const TH_CENTER = [100.9925, 13.0];

  /* ---------- header menu ---------- */
  const menuBtn = $('[data-menu]');
  if (menuBtn) menuBtn.addEventListener('click', () => {
    const nav = $('#nav');
    const open = nav.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  $$('[data-toggle]').forEach((b) => b.addEventListener('click', () => $('#' + b.dataset.toggle).classList.toggle('open')));

  /* ---------- money inputs ---------- */
  function bindMoney(el) {
    el.addEventListener('input', () => {
      const raw = el.value.replace(/[^\d]/g, '');
      el.value = raw ? fmt(Number(raw)) : '';
    });
  }
  $$('[data-money]').forEach(bindMoney);

  /* ---------- cascading geo selects ---------- */
  async function fillSelect(sel, url, placeholder) {
    sel.disabled = true;
    sel.innerHTML = `<option value="">${placeholder}</option>`;
    if (!url) return;
    try {
      const rows = await (await fetch(url)).json();
      for (const r of rows) sel.add(new Option(r.name, r.code));
      sel.disabled = !rows.length;
    } catch { /* offline */ }
  }
  $$('[data-province-select]').forEach((p) => {
    const d = document.getElementById(p.dataset.provinceSelect);
    p.addEventListener('change', async () => {
      await fillSelect(d, p.value ? `/api/geo/districts?province=${p.value}` : null, d.id === 'f-dist' ? 'ทุกอำเภอ' : 'เลือกอำเภอ');
      if (d.dataset.districtSelect) {
        const s = document.getElementById(d.dataset.districtSelect);
        fillSelect(s, null, 'เลือกตำบล');
      }
      d.dispatchEvent(new Event('geo:changed'));
    });
  });
  $$('[data-district-select]').forEach((d) => {
    const s = document.getElementById(d.dataset.districtSelect);
    d.addEventListener('change', () => fillSelect(s, d.value ? `/api/geo/subdistricts?district=${d.value}` : null, 'เลือกตำบล'));
  });

  /* ---------- search page ---------- */
  const filters = $('[data-filters]');
  const sortSel = $('[data-sort]');
  if (sortSel && filters) sortSel.addEventListener('change', () => { filters.elements.sort.value = sortSel.value; filters.submit(); });
  if (filters) filters.addEventListener('submit', () => {
    // ไม่ส่งช่องว่าง ให้ URL สะอาด
    $$('input,select', filters).forEach((el) => { if (!el.value) el.disabled = true; });
  });

  function whenMaps(cb) {
    if (window.maplibregl) return cb(window.maplibregl);
    let tries = 0;
    const t = setInterval(() => {
      if (window.maplibregl) { clearInterval(t); cb(window.maplibregl); }
      else if (++tries > 100) clearInterval(t);
    }, 100);
  }
  function makeMap(el, opts = {}) {
    return new Promise((resolve) => whenMaps((ml) => {
      try {
        const map = new ml.Map({ container: el, style: MAP_STYLE, center: opts.center || TH_CENTER, zoom: opts.zoom || 5, attributionControl: { compact: true }, cooperativeGestures: !!opts.coop });
        map.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right');
        resolve({ map, ml });
      } catch (e) { el.innerHTML = '<div class="muted small" style="padding:20px">ไม่สามารถโหลดแผนที่ได้</div>'; resolve(null); }
    }));
  }

  const mapToggle = $('[data-map-toggle]');
  const mapBox = $('#results-map');
  let resultsMap = null;
  if (mapToggle && mapBox) mapToggle.addEventListener('click', async () => {
    const hidden = mapBox.classList.toggle('hidden');
    mapToggle.querySelector('span').textContent = hidden ? 'แสดงแผนที่' : 'ซ่อนแผนที่';
    if (hidden || resultsMap) { if (resultsMap) resultsMap.map.resize(); return; }
    resultsMap = await makeMap(mapBox, { coop: true });
    if (!resultsMap) return;
    const { map, ml } = resultsMap;
    const bounds = new ml.LngLatBounds();
    let n = 0;
    $$('.card[data-lat]').forEach((card) => {
      const lat = parseFloat(card.dataset.lat), lng = parseFloat(card.dataset.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const price = Number(card.dataset.price);
      const label = price >= 1e6 ? (Math.round(price / 1e5) / 10) + 'ล.' : fmt(Math.round(price / 1000)) + 'K';
      const el = document.createElement('a');
      el.href = card.getAttribute('href');
      el.textContent = '฿' + label;
      el.style.cssText = 'background:#0f1d2c;color:#fff;font:600 12px/1 sans-serif;padding:6px 9px;border-radius:999px;box-shadow:0 2px 8px rgba(0,0,0,.25);border:2px solid #fff;white-space:nowrap';
      const title = card.querySelector('.card-title')?.textContent || '';
      new ml.Marker({ element: el }).setLngLat([lng, lat]).setPopup(new ml.Popup({ offset: 18 }).setText(title)).addTo(map);
      el.addEventListener('mouseenter', () => card.style.outline = '2px solid #b8924a');
      el.addEventListener('mouseleave', () => card.style.outline = '');
      bounds.extend([lng, lat]); n++;
    });
    if (n) map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 0 });
  });

  /* ---------- listing detail ---------- */
  const pointEl = $('[data-map-point]');
  if (pointEl) {
    const [lat, lng] = pointEl.dataset.mapPoint.split(',').map(Number);
    makeMap(pointEl, { center: [lng, lat], zoom: 14, coop: true }).then((r) => {
      if (!r) return;
      new r.ml.Marker({ color: '#b8924a' }).setLngLat([lng, lat]).addTo(r.map);
    });
  }

  const gallery = $('[data-gallery]');
  const lb = $('[data-lightbox]');
  if (gallery && lb) {
    const items = $$('a[data-full]', gallery).map((a) => a.dataset.full);
    let idx = 0;
    const img = $('img', lb);
    const show = (i) => { idx = (i + items.length) % items.length; img.src = items[idx]; $('.lb-count', lb).textContent = `${idx + 1} / ${items.length}`; };
    gallery.addEventListener('click', (e) => {
      const a = e.target.closest('a[data-full]');
      if (!a) return;
      e.preventDefault();
      show(Number(a.dataset.i)); lb.classList.add('open'); document.body.style.overflow = 'hidden';
    });
    const close = () => { lb.classList.remove('open'); document.body.style.overflow = ''; };
    $('.lb-close', lb).addEventListener('click', close);
    $('.lb-prev', lb).addEventListener('click', () => show(idx - 1));
    $('.lb-next', lb).addEventListener('click', () => show(idx + 1));
    lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
    document.addEventListener('keydown', (e) => {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });
  }

  $$('[data-share]').forEach((b) => b.addEventListener('click', async (e) => {
    e.preventDefault();
    const url = location.origin + location.pathname;
    const kind = b.dataset.share;
    if (kind === 'line') window.open('https://social-plugins.line.me/lineit/share?url=' + encodeURIComponent(url), '_blank', 'noopener');
    else if (kind === 'facebook') window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url), '_blank', 'noopener');
    else { try { await navigator.clipboard.writeText(url); b.textContent = 'คัดลอกแล้ว ✓'; } catch { prompt('คัดลอกลิงก์', url); } }
  }));

  /* ---------- lead forms (สนใจทรัพย์ / ฝากขาย) ---------- */
  function msg(form, text, ok) {
    const m = $('.form-msg', form);
    if (m) m.innerHTML = text ? `<div class="alert ${ok ? 'alert-ok' : 'alert-bad'}" style="margin:12px 0 0">${text}</div>` : '';
  }
  function resetTurnstile(form) { try { const w = $('.cf-turnstile', form); if (window.turnstile && w) window.turnstile.reset(w); } catch { /* ignore */ } }
  $$('[data-lead-form]').forEach((form) => form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('button[type=submit]', form);
    const fd = new FormData(form);
    const body = Object.fromEntries(fd.entries());
    body.kind = form.dataset.kind || 'inquiry';
    if (form.dataset.listing) body.listingId = Number(form.dataset.listing);
    body.consent = !!fd.get('consent');
    if (!body['cf-turnstile-response']) return msg(form, 'กรุณารอให้ระบบยืนยันว่าไม่ใช่บอทสักครู่ แล้วกดส่งอีกครั้ง');
    btn.disabled = true; msg(form, '');
    try {
      const r = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      if (j.ok) { form.reset(); msg(form, 'ส่งข้อมูลเรียบร้อย ทีมงานจะติดต่อกลับโดยเร็ว ขอบคุณครับ/ค่ะ', true); }
      else msg(form, j.error || 'ส่งไม่สำเร็จ');
    } catch { msg(form, 'เชื่อมต่อไม่ได้ กรุณาลองใหม่'); }
    btn.disabled = false; resetTurnstile(form);
  }));

  /* ---------- confirm / autosubmit ---------- */
  $$('form[data-confirm]').forEach((f) => f.addEventListener('submit', (e) => { if (!confirm(f.dataset.confirm)) e.preventDefault(); }));
  $$('[data-autosubmit]').forEach((s) => s.addEventListener('change', () => s.form.submit()));

  /* ---------- post form ---------- */
  const post = $('#post-form');
  if (post) initPost(post);

  function initPost(form) {
    const MAX = Number(form.dataset.maxImages || 12);
    const typeVal = () => form.elements.type.value;
    const dealVal = () => form.elements.deal.value;
    function sync() {
      const t = typeVal(), d = dealVal();
      $$('[data-for]', form).forEach((el) => {
        const on = el.dataset.for.split(' ').includes(t);
        el.hidden = !on;
        $$('input,select,textarea', el).forEach((i) => { i.disabled = !on; });
      });
      $$('[data-deal-only]', form).forEach((el) => {
        const on = el.dataset.dealOnly === d;
        el.hidden = !on;
        $$('input,select,textarea', el).forEach((i) => { if (!on) i.disabled = true; else if (!i.closest('[data-for][hidden]')) i.disabled = false; });
      });
      $$('[data-deal-label]', form).forEach((el) => { el.hidden = el.dataset.dealLabel !== d; });
    }
    form.addEventListener('change', (e) => { if (['type', 'deal'].includes(e.target.name)) sync(); });
    sync();

    const priceEl = form.elements.price;
    const words = $('[data-price-words]', form);
    priceEl.addEventListener('input', () => {
      const n = num(priceEl.value);
      words.textContent = n >= 1e6 ? `≈ ${(n / 1e6).toLocaleString('th-TH', { maximumFractionDigits: 2 })} ล้านบาท` : n ? `≈ ${fmt(n)} บาท` : '';
    });
    const landTotal = $('[data-land-total]', form);
    ['landRai', 'landNgan', 'landWah'].forEach((k) => form.elements[k].addEventListener('input', () => {
      const t = num(form.elements.landRai.value) * 400 + num(form.elements.landNgan.value) * 100 + num(form.elements.landWah.value);
      landTotal.textContent = t ? `รวม ${fmt(t)} ตร.ว. (${fmt(t * 4)} ตร.ม.)` : '';
    }));

    /* ----- map pin ----- */
    const pickEl = $('#pick-map');
    const statusBox = $('[data-pin-status]', form);
    const statusText = $('[data-latlng-text]', form);
    const clearBtn = $('[data-pin-clear]', form);
    const hint = $('[data-pick-hint]', form);
    let pick = null, marker = null, pending = null;
    const inThailand = (lat, lng) => lat >= 5 && lat <= 21 && lng >= 97 && lng <= 106;
    function setPoint(lng, lat, fly, zoom) {
      if (!inThailand(lat, lng)) { alert('ตำแหน่งนี้อยู่นอกประเทศไทย กรุณาตรวจสอบอีกครั้ง'); return; }
      form.elements.lat.value = lat.toFixed(6); form.elements.lng.value = lng.toFixed(6);
      statusText.textContent = `✓ ปักหมุดแล้ว (${lat.toFixed(5)}, ${lng.toFixed(5)}) — ลากหมุดหรือแตะจุดอื่นเพื่อปรับ`;
      statusBox.classList.add('ok'); clearBtn.hidden = false;
      if (hint) hint.textContent = 'ลากหมุดเพื่อปรับตำแหน่งให้ตรงยิ่งขึ้น';
      if (!pick) { pending = { lng, lat, zoom }; return; }
      if (!marker) {
        marker = new pick.ml.Marker({ color: '#b8924a', draggable: true }).setLngLat([lng, lat]).addTo(pick.map);
        marker.on('dragend', () => { const p = marker.getLngLat(); setPoint(p.lng, p.lat); });
      } else marker.setLngLat([lng, lat]);
      if (fly) {
        pick.map.resize();
        const z = Math.max(pick.map.getZoom(), zoom || 16);
        // ถ้าแผนที่ยังโหลดไม่เสร็จ ใช้ jumpTo (flyTo อาจถูกยกเลิก)
        if (pick.map.loaded()) pick.map.flyTo({ center: [lng, lat], zoom: z }); else pick.map.jumpTo({ center: [lng, lat], zoom: z });
      }
    }
    clearBtn.addEventListener('click', () => {
      form.elements.lat.value = ''; form.elements.lng.value = '';
      if (marker) { marker.remove(); marker = null; }
      statusText.textContent = 'ยังไม่ได้ปักหมุด'; statusBox.classList.remove('ok'); clearBtn.hidden = true;
      if (hint) hint.textContent = 'แตะบนแผนที่เพื่อปักหมุด · ลากหมุดเพื่อปรับตำแหน่ง';
    });
    /* ----- แก้ไขประกาศ: เติมอำเภอ/ตำบล และหมุดเดิม ----- */
    if (form.dataset.edit) {
      const pv = form.elements.provinceCode, dv = form.elements.districtCode, sv = form.elements.subdistrictCode;
      (async () => {
        if (pv.value && dv.dataset.value) {
          await fillSelect(dv, `/api/geo/districts?province=${pv.value}`, 'เลือกอำเภอ');
          dv.value = dv.dataset.value;
          if (sv) { await fillSelect(sv, `/api/geo/subdistricts?district=${dv.value}`, 'เลือกตำบล'); if (sv.dataset.value) sv.value = sv.dataset.value; }
        }
      })();
      const la = Number(form.elements.lat.value), lo = Number(form.elements.lng.value);
      if (la && lo) setPoint(lo, la, true, 16);
    }
    if (pickEl) makeMap(pickEl, { center: [101.5, 13.4], zoom: 4.8, coop: matchMedia('(hover: none)').matches }).then((r) => {
      pick = r; if (!r) return;
      r.map.on('click', (e) => setPoint(e.lngLat.lng, e.lngLat.lat));
      if (pending) { setPoint(pending.lng, pending.lat, true, pending.zoom); pending = null; }
    });

    // GPS
    const geoBtn = $('[data-geolocate]', form);
    if (geoBtn) geoBtn.addEventListener('click', () => {
      if (!navigator.geolocation) { alert('อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง'); return; }
      if (!window.isSecureContext) { alert('การใช้ GPS ต้องเปิดเว็บผ่าน https'); return; }
      const label = geoBtn.innerHTML;
      geoBtn.disabled = true; geoBtn.textContent = 'กำลังหาตำแหน่ง…';
      navigator.geolocation.getCurrentPosition((p) => {
        geoBtn.disabled = false; geoBtn.innerHTML = label;
        setPoint(p.coords.longitude, p.coords.latitude, true, 17);
        pickEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, (err) => {
        geoBtn.disabled = false; geoBtn.innerHTML = label;
        alert(err.code === 1 ? 'ไม่ได้รับอนุญาตให้ใช้ตำแหน่ง — กรุณากด "อนุญาต" ในเบราว์เซอร์ แล้วลองอีกครั้ง' : 'หาตำแหน่งไม่สำเร็จ ลองออกไปที่โล่งหรือเปิด GPS แล้วกดอีกครั้ง');
      }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
    });

    // วางลิงก์ Google Maps หรือพิกัด
    const gmIn = $('[data-gmap-input]', form), gmBtn = $('[data-gmap-apply]', form);
    function parseLatLng(text) {
      const t = decodeURIComponent(String(text || '')).trim();
      const pats = [/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/, /@(-?\d+\.\d+),\s*(-?\d+\.\d+)/, /[?&](?:q|query|ll|center|destination)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/, /^(-?\d{1,2}\.\d+)\s*[, ]\s*(-?\d{2,3}\.\d+)$/];
      for (const re of pats) { const m = t.match(re); if (m) return [parseFloat(m[1]), parseFloat(m[2])]; }
      return null;
    }
    async function applyGmap() {
      const v = gmIn.value.trim(); if (!v) return;
      let ll = parseLatLng(v);
      if (!ll && /^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|maps\.google\.|www\.google\.[a-z.]+\/maps)/i.test(v)) {
        gmBtn.disabled = true; gmBtn.textContent = 'กำลังอ่านลิงก์…';
        try { const j = await (await fetch('/api/geo/resolve?url=' + encodeURIComponent(v))).json(); if (j.ok) ll = [j.lat, j.lng]; } catch { /* ignore */ }
        gmBtn.disabled = false; gmBtn.textContent = 'ใช้ตำแหน่งนี้';
      }
      if (!ll) { alert('อ่านพิกัดจากข้อความนี้ไม่ได้ — ใน Google Maps ให้กดค้างที่จุด แล้วคัดลอกตัวเลขพิกัด (เช่น 15.2448, 104.8473) มาวาง'); return; }
      setPoint(ll[1], ll[0], true, 17); gmIn.value = '';
    }
    gmBtn.addEventListener('click', applyGmap);
    gmIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); applyGmap(); } });

    // เลือกจังหวัด/อำเภอ/ตำบล → เลื่อนแผนที่ไปพื้นที่นั้น (OpenStreetMap Nominatim, แคชในเครื่อง)
    const selText = (sel) => (sel && sel.value ? sel.options[sel.selectedIndex].text : '');
    async function geocode(q) {
      const key = 'sl-geo:' + q;
      try { const c = localStorage.getItem(key); if (c) return JSON.parse(c); } catch { /* ignore */ }
      try {
        const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=th&accept-language=th&q=' + encodeURIComponent(q));
        const j = await r.json();
        if (!j[0]) return null;
        const v = { lat: +j[0].lat, lng: +j[0].lon };
        try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ }
        return v;
      } catch { return null; }
    }
    async function flyToArea(level) {
      if (!pick || form.elements.lat.value) return; // ปักหมุดแล้ว ไม่เลื่อนแผนที่ทับ
      const prov = selText(form.elements.provinceCode), dist = selText(form.elements.districtCode), sub = selText(form.elements.subdistrictCode);
      const bkk = form.elements.provinceCode.value === '10';
      const parts = level === 'sub' ? [sub && (bkk ? 'แขวง' : 'ตำบล') + sub, dist && (bkk ? 'เขต' : 'อำเภอ') + dist, prov] : level === 'dist' ? [dist && (bkk ? 'เขต' : 'อำเภอ') + dist, prov] : [bkk ? 'กรุงเทพมหานคร' : 'จังหวัด' + prov];
      const v = await geocode(parts.filter(Boolean).join(' '));
      if (v && inThailand(v.lat, v.lng) && !form.elements.lat.value) pick.map.flyTo({ center: [v.lng, v.lat], zoom: level === 'sub' ? 14 : level === 'dist' ? 12 : 9 });
    }
    form.elements.provinceCode.addEventListener('change', () => flyToArea('prov'));
    form.elements.districtCode.addEventListener('change', () => flyToArea('dist'));
    form.elements.subdistrictCode.addEventListener('change', () => flyToArea('sub'));

    /* ----- images: ถ่ายจากกล้อง/เลือกจากเครื่อง แล้วย่อเป็น 400/800/1600px ----- */
    const drop = $('[data-dropzone]', form);
    const inputs = $$('[data-file-input]', form);
    const thumbs = $('[data-thumbs]', form);
    const countEl = $('[data-photo-count]', form);
    const images = []; // { id, url, out, ext, w, h, ready } | { id, existing, thumb }
    let uid = 0;
    $$('[data-existing] i', form).forEach((el) => images.push({ id: ++uid, existing: Number(el.dataset.idx), thumb: el.dataset.src, ready: Promise.resolve() }));
    const canWebp = (() => { try { return document.createElement('canvas').toDataURL('image/webp').startsWith('data:image/webp'); } catch { return false; } })();

    async function decode(file) {
      if ('createImageBitmap' in window) {
        try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { /* fallback */ }
      }
      return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
    }
    function toBlob(canvas, type, q) { return new Promise((res) => canvas.toBlob(res, type, q)); }
    async function resize(file) {
      const bmp = await decode(file);
      const W = bmp.naturalWidth || bmp.width, H = bmp.naturalHeight || bmp.height;
      if (!W || !H) throw new Error('decode');
      const out = {};
      const type = canWebp ? 'image/webp' : 'image/jpeg';
      for (const s of [1600, 800, 400]) {
        const scale = Math.min(1, s / Math.max(W, H));
        const w = Math.round(W * scale), h = Math.round(H * scale);
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        const ctx = cv.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(bmp, 0, 0, w, h);
        out[s] = await toBlob(cv, type, s === 400 ? 0.78 : 0.82);
        if (!out[s]) throw new Error('encode');
      }
      if (bmp.close) bmp.close();
      return { out, ext: canWebp ? 'webp' : 'jpg', w: W, h: H, thumb: URL.createObjectURL(out[400]) };
    }
    function render() {
      thumbs.innerHTML = '';
      images.forEach((im, i) => {
        const d = document.createElement('div');
        d.className = 'thumb' + (im.existing != null ? ' old' : im.out ? '' : im.failed ? ' bad' : ' busy');
        d.innerHTML = `<img src="${im.thumb || ''}" alt="">${i === 0 ? '<span class="cover">ปก</span>' : ''}<button type="button" aria-label="ลบรูป">✕</button>`;
        d.title = i === 0 ? 'รูปปก' : 'แตะเพื่อตั้งเป็นรูปปก';
        $('button', d).addEventListener('click', (e) => { e.stopPropagation(); if (im.thumb && im.existing == null) URL.revokeObjectURL(im.thumb); images.splice(i, 1); render(); });
        d.addEventListener('click', () => { if (i) { images.unshift(images.splice(i, 1)[0]); render(); } });
        thumbs.appendChild(d);
      });
      countEl.textContent = images.length ? `${images.length}/${MAX} รูป` : '';
    }
    function addFiles(files) {
      let skipped = 0;
      for (const f of Array.from(files || [])) {
        if (images.length >= MAX) { alert(`อัปโหลดได้สูงสุด ${MAX} รูป`); break; }
        if (f.type && !f.type.startsWith('image/')) { skipped++; continue; }
        if (f.size > 40 * 1024 * 1024) { alert('ไฟล์รูปใหญ่เกิน 40MB'); continue; }
        const im = { id: ++uid };
        im.ready = resize(f).then((r) => { Object.assign(im, r); render(); }).catch(() => {
          im.failed = true;
          const i = images.indexOf(im); if (i >= 0) images.splice(i, 1);
          render();
          alert('เปิดรูปนี้ไม่ได้ (อาจเป็นไฟล์ HEIC) — ลองถ่ายใหม่ด้วยปุ่ม "ถ่ายรูป" หรือตั้งกล้องเป็น "เข้ากันได้มากที่สุด / JPEG"');
        });
        images.push(im);
      }
      if (skipped) alert('ข้ามไฟล์ที่ไม่ใช่รูปภาพ ' + skipped + ' ไฟล์');
      render();
    }
    inputs.forEach((inp) => inp.addEventListener('change', () => { addFiles(inp.files); inp.value = ''; }));
    if (images.length) render();
    if (drop) {
      ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('drag'); }));
      ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('drag'); }));
      drop.addEventListener('drop', (e) => addFiles(e.dataTransfer.files));
    }

    /* ----- submit ----- */
    const bar = $('[data-progress]', form);
    const fail = (text, field) => {
      msg(form, text);
      $$('.input.err', form).forEach((i) => i.classList.remove('err'));
      if (field) {
        const el = form.elements[field];
        const node = el && (el.length && !el.tagName ? el[0] : el);
        if (node && node.classList) { node.classList.add('err'); node.focus({ preventScroll: false }); node.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      }
    };
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const req = ['title', 'price', 'description', 'provinceCode', 'districtCode', 'ownerName', 'ownerPhone'];
      for (const k of req) { const el = form.elements[k]; if (el && !el.disabled && !String(el.value).trim()) return fail('กรุณากรอกข้อมูลที่จำเป็นให้ครบ', k); }
      if (form.elements.title.value.trim().length < 10) return fail('หัวข้อประกาศอย่างน้อย 10 ตัวอักษร', 'title');
      if (form.elements.description.value.trim().length < 30) return fail('รายละเอียดอย่างน้อย 30 ตัวอักษร', 'description');
      if (!form.elements.consent.checked) return fail('กรุณายืนยันข้อกำหนดและนโยบายความเป็นส่วนตัว', 'consent');
      const fd = new FormData(form);
      if (!fd.get('cf-turnstile-response')) return fail('กรุณารอให้ระบบยืนยันว่าไม่ใช่บอท แล้วกดส่งอีกครั้ง');
      const btn = $('button[type=submit]', form);
      btn.disabled = true;
      msg(form, '<span>กำลังเตรียมรูปภาพ…</span>', true);
      await Promise.all(images.map((i) => i.ready));
      let n = 0;
      for (const im of images) {
        if (im.existing != null) { fd.append('order', 'k:' + im.existing); continue; }
        if (im.failed || !im.out) continue;
        fd.append('order', 'n:' + n);
        for (const s of [400, 800, 1600]) fd.append(`img_${n}_${s}`, im.out[s], `${n}-${s}.${im.ext}`);
        fd.append(`img_${n}_w`, im.w); fd.append(`img_${n}_h`, im.h);
        n++;
      }
      const xhr = new XMLHttpRequest();
      xhr.open('POST', form.dataset.action || '/api/listings');
      bar.style.display = 'block';
      xhr.upload.onprogress = (ev) => { if (ev.lengthComputable) $('i', bar).style.width = Math.round((ev.loaded / ev.total) * 100) + '%'; };
      msg(form, 'กำลังส่งประกาศ…', true);
      xhr.onload = () => {
        bar.style.display = 'none';
        let j = {};
        try { j = JSON.parse(xhr.responseText); } catch { /* ignore */ }
        if (xhr.status === 200 && j.ok && j.redirect) { location.href = j.redirect; return; }
        if (xhr.status === 200 && j.ok) {
          const tpl = $('#post-done');
          const node = tpl.content.cloneNode(true);
          $('[data-ref]', node).textContent = j.ref;
          $('[data-manage]', node).value = j.manageUrl;
          const shell = form.closest('.form-shell');
          shell.innerHTML = '';
          shell.style.display = 'block';
          shell.appendChild(node);
          $('[data-copy]', shell).addEventListener('click', async (ev) => {
            const v = $('[data-manage]', shell).value;
            try { await navigator.clipboard.writeText(v); ev.target.textContent = 'คัดลอกแล้ว ✓'; } catch { $('[data-manage]', shell).select(); }
          });
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
        if (xhr.status === 401 && j.login) { location.href = '/login?next=' + encodeURIComponent(location.pathname); return; }
        btn.disabled = false; resetTurnstile(form);
        const first = j.errors && Object.keys(j.errors)[0];
        fail((j.errors ? Object.values(j.errors).join(' · ') : '') || j.error || 'ส่งไม่สำเร็จ กรุณาลองใหม่', first);
      };
      xhr.onerror = () => { bar.style.display = 'none'; btn.disabled = false; resetTurnstile(form); fail('เชื่อมต่อไม่ได้ กรุณาลองใหม่'); };
      xhr.send(fd);
    });
  }

  /* ---------- tools ---------- */
  const tools = $('[data-tools]');
  if (tools) {
    const u = (k) => $(`[data-u="${k}"]`, tools);
    const outLand = $('[data-out="land"]', tools);
    const calcLand = (fromSqm) => {
      let sqw;
      if (fromSqm) { sqw = num(u('sqm').value) / 4; const r = Math.floor(sqw / 400), g = Math.floor((sqw % 400) / 100), w = Math.round((sqw % 100) * 100) / 100; u('rai').value = r || ''; u('ngan').value = g || ''; u('wah').value = w || ''; }
      else { sqw = num(u('rai').value) * 400 + num(u('ngan').value) * 100 + num(u('wah').value); u('sqm').value = sqw ? Math.round(sqw * 4 * 100) / 100 : ''; }
      outLand.innerHTML = sqw ? `<b>${fmt(Math.round(sqw * 100) / 100)}</b> ตร.ว. · <b>${fmt(Math.round(sqw * 4 * 100) / 100)}</b> ตร.ม. · ${(sqw / 400).toLocaleString('th-TH', { maximumFractionDigits: 3 })} ไร่` : 'กรอกขนาดเพื่อคำนวณ';
    };
    ['rai', 'ngan', 'wah'].forEach((k) => u(k).addEventListener('input', () => calcLand(false)));
    u('sqm').addEventListener('input', () => calcLand(true));

    const m = (k) => num($(`[data-m="${k}"]`, tools).value);
    const outM = $('[data-out="mortgage"]', tools);
    const calcM = () => {
      const loan = m('price') * (1 - m('down') / 100), r = m('rate') / 100 / 12, n = m('years') * 12;
      if (!loan || !n) { outM.textContent = ''; return; }
      const pay = r ? loan * r / (1 - Math.pow(1 + r, -n)) : loan / n;
      outM.innerHTML = `ค่างวดประมาณ <b>฿${fmt(Math.round(pay))}</b> /เดือน<br><span class="small muted">ยอดกู้ ฿${fmt(Math.round(loan))} · ดอกเบี้ยรวม ฿${fmt(Math.round(pay * n - loan))} · รายได้ที่ควรมี ≈ ฿${fmt(Math.round(pay / 0.4))}/เดือน</span>`;
    };
    $$('[data-m]', tools).forEach((i) => i.addEventListener('input', calcM)); calcM();

    const t = (k) => $(`[data-t="${k}"]`, tools);
    const outT = $('[data-out="transfer"]', tools);
    const calcT = () => {
      const ap = num(t('appraised').value), sale = num(t('sale').value), hi = Math.max(ap, sale);
      const fee = ap * 0.02, stamp = t('sbt').checked ? 0 : hi * 0.005, sbt = t('sbt').checked ? hi * 0.033 : 0;
      outT.innerHTML = `ค่าธรรมเนียมโอน 2%: <b>฿${fmt(Math.round(fee))}</b><br>${t('sbt').checked ? `ภาษีธุรกิจเฉพาะ 3.3%: <b>฿${fmt(Math.round(sbt))}</b>` : `อากรแสตมป์ 0.5%: <b>฿${fmt(Math.round(stamp))}</b>`}<br><span class="small muted">รวมโดยประมาณ ฿${fmt(Math.round(fee + stamp + sbt))} (ไม่รวมภาษีเงินได้หัก ณ ที่จ่าย)</span>`;
    };
    $$('[data-t]', tools).forEach((i) => i.addEventListener('input', calcT)); t('sbt').addEventListener('change', calcT); calcT();
  }
})();
