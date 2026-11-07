/** Markdown ขนาดเล็กสำหรับบทความคู่มือ (เนื้อหาเขียนเองในโค้ด ไม่ใช่ข้อมูลจากผู้ใช้)
 *  รองรับ: ย่อหน้า (เว้นบรรทัด), รายการ "- ", รายการเลข "1. ", หัวข้อย่อย "### ", ตาราง "| a | b |",
 *  หัวข้อ "## ", ภาพ "![alt](src)" (บรรทัดถัดไปเป็นคำบรรยาย), **ตัวหนา**, [ลิงก์](url), กล่องเน้น "> " */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function inline(s: string): string {
  let out = esc(s);
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, text: string, url: string) => {
    const ext = /^https?:\/\//.test(url);
    return `<a href="${url}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ''}>${text}${ext ? ' ↗' : ''}</a>`;
  });
  return out;
}

export function md(src: string): string {
  const blocks = src.trim().split(/\n\s*\n/);
  return blocks.map((b) => {
    const lines = b.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return '';
    if (lines[0].startsWith('## ')) {
      const rest = lines.slice(1).join('\n');
      return `<h2>${inline(lines[0].slice(3))}</h2>${rest ? md(rest) : ''}`;
    }
    if (/^!\[[^\]]*\]\([^)\s]+\)/.test(lines[0])) {
      const m = lines[0].match(/^!\[([^\]]*)\]\(([^)\s]+)\)/)!;
      const cap = lines.slice(1).join(' ');
      return `<figure class="g-fig"><img src="${esc(m[2])}" alt="${esc(m[1])}" loading="lazy" decoding="async" width="1200" height="675" />${cap ? `<figcaption>${inline(cap)}</figcaption>` : ''}</figure>`;
    }
    if (lines[0].startsWith('### ')) {
      const rest = lines.slice(1).join('\n');
      return `<h3>${inline(lines[0].slice(4))}</h3>${rest ? md(rest) : ''}`;
    }
    if (lines.every((l) => l.startsWith('- '))) return `<ul>${lines.map((l) => `<li>${inline(l.slice(2))}</li>`).join('')}</ul>`;
    if (lines.every((l) => /^\d+\.\s/.test(l))) return `<ol>${lines.map((l) => `<li>${inline(l.replace(/^\d+\.\s/, ''))}</li>`).join('')}</ol>`;
    if (lines.every((l) => l.startsWith('> '))) return `<div class="g-note">${lines.map((l) => `<p>${inline(l.slice(2))}</p>`).join('')}</div>`;
    if (lines.every((l) => l.startsWith('|'))) {
      const rows = lines.filter((l) => !/^\|(\s*:?-{2,}:?\s*\|)+$/.test(l))
        .map((l) => l.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
      const [head, ...body] = rows;
      return `<div class="g-table"><table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    }
    return `<p>${lines.map(inline).join('<br />')}</p>`;
  }).join('\n');
}

/** ข้อความล้วน (สำหรับ FAQ JSON-LD) */
export const plain = (s: string) => s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
