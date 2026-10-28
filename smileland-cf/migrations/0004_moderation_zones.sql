-- อีสานน่าอยู่ 0004 — แก้ไขแล้วส่งตรวจใหม่ + โซนแสดงผลหน้าแรก (A/B/C)
ALTER TABLE listings ADD COLUMN revision integer DEFAULT 0 NOT NULL;   -- จำนวนครั้งที่ผู้โพสต์แก้ไขแล้วส่งตรวจใหม่
ALTER TABLE listings ADD COLUMN zone text;                              -- 'A' โชว์เด่น | 'B' แนะนำ | 'C' ปักหมุดหน้าค้นหา | NULL
ALTER TABLE listings ADD COLUMN zone_order integer DEFAULT 0 NOT NULL;  -- ลำดับในโซน (น้อย = ก่อน)
ALTER TABLE listings ADD COLUMN zone_until integer;                     -- หมดเวลาโซน (unix) | NULL = ไม่กำหนด
UPDATE listings SET zone = 'B' WHERE featured = 1 AND ref NOT LIKE 'SL-DEMO%';
CREATE INDEX listings_zone ON listings (zone, status);
