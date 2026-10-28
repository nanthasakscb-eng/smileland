/** @jsxImportSource hono/jsx */
import type { FC } from 'hono/jsx';
import { PROVINCE_SLIDES } from '../../data/province-photos';
import { HERO_SLIDES, BAND_SLIDES, CONSIGN_SLIDES, GUIDE_SLIDES, TOOLS_SLIDES } from '../../data/photos';
import { Crumbs } from '../ui';

/** หน้าเครดิตภาพ — แสดงข้อมูลตามเงื่อนไข Creative Commons (ผู้สร้าง ชื่อภาพ ต้นฉบับ สัญญาอนุญาต และการดัดแปลง) */
export const CreditsPage: FC = () => (
  <div class="wrap" style="max-width:860px;padding-bottom:72px">
    <Crumbs items={[['หน้าแรก', '/'], ['เครดิตภาพ']]} />
    <div class="page-head"><h1>เครดิตภาพ</h1></div>
    <p>ภาพพื้นหลังหน้าแรก หัวหน้าต่าง ๆ และหัวคู่มือรายจังหวัดเป็นภาพถ่ายจริงจาก <a href="https://commons.wikimedia.org/" target="_blank" rel="noopener noreferrer" style="text-decoration:underline">Wikimedia Commons</a> ที่เจ้าของภาพอนุญาตให้นำไปใช้ได้ตามสัญญาอนุญาต Creative Commons อีสานน่าอยู่ใช้ภาพตามเงื่อนไขดังนี้</p>
    <ul>
      <li>ระบุชื่อผู้สร้างสรรค์ ลิงก์ต้นฉบับ และลิงก์สัญญาอนุญาตของทุกภาพ</li>
      <li>การดัดแปลง: ครอบภาพเป็นสัดส่วน 16:9 หรือ 3:1 (หัวหน้าค้นหา) ปรับขนาด และแปลงเป็นไฟล์ WebP ไม่ได้แก้ไขเนื้อหาภาพ บนหน้าเว็บมีการซ้อนแถบสีเข้มเพื่อให้อ่านตัวอักษรได้</li>
      <li>ภาพที่ใช้สัญญา CC BY-SA: ภาพที่ครอบและปรับขนาดแล้วเผยแพร่ภายใต้สัญญาอนุญาตเดียวกับต้นฉบับ (CC BY-SA รุ่นเดียวกัน)</li>
      <li>การใช้ภาพไม่ได้หมายความว่าเจ้าของภาพรับรองหรือเกี่ยวข้องกับอีสานน่าอยู่</li>
    </ul>
    <div style="overflow-x:auto;margin-top:16px">
      <table style="width:100%;border-collapse:collapse;font-size:15px;min-width:600px">
        <thead><tr style="text-align:left;border-bottom:1px solid var(--line-2)"><th style="padding:8px">ภาพ</th><th style="padding:8px">สถานที่</th><th style="padding:8px">ผู้สร้างสรรค์</th><th style="padding:8px">สัญญาอนุญาต</th></tr></thead>
        <tbody>
          {[...HERO_SLIDES, ...BAND_SLIDES, ...CONSIGN_SLIDES, ...GUIDE_SLIDES, ...TOOLS_SLIDES, ...Object.values(PROVINCE_SLIDES).flat()].map((h) => (
            <tr style="border-bottom:1px solid var(--line-2);vertical-align:top">
              <td style="padding:8px"><a href={h.credit.url} target="_blank" rel="noopener noreferrer"><img src={`${h.src}-${h.src.includes('/band-') ? 800 : 960}.webp`} alt={h.alt} width="160" height="90" loading="lazy" style="border-radius:8px;object-fit:cover" /></a></td>
              <td style="padding:8px">{h.caption}<br /><a href={h.credit.url} target="_blank" rel="noopener noreferrer" style="text-decoration:underline;font-size:13px">ดูต้นฉบับบน Wikimedia Commons ↗</a></td>
              <td style="padding:8px">{h.credit.by}</td>
              <td style="padding:8px"><a href={h.credit.licenseUrl} target="_blank" rel="noopener noreferrer license" style="text-decoration:underline">{h.credit.license}</a><br /><small class="muted">ครอบภาพ/ปรับขนาด{h.credit.license.includes('SA') ? ' · เผยแพร่ภาพที่ดัดแปลงภายใต้สัญญาเดียวกัน' : ''}</small></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <p class="small muted" style="margin-top:20px">ภาพในบทความเที่ยวอีสานกันมีเครดิตกำกับไว้ใต้ภาพแต่ละภาพในหน้าบทความนั้น หากคุณเป็นเจ้าของภาพและต้องการให้แก้ไขเครดิตหรือนำภาพออก กรุณาติดต่อทีมงานผ่านหน้า <a href="/consign" style="text-decoration:underline">ติดต่อ</a></p>
  </div>
);
