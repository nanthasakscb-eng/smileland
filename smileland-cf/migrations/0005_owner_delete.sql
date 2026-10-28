-- อีสานน่าอยู่ 0005 — ผู้โพสต์ลบประกาศเองได้ (ซ่อนจากบัญชีและหน้าเว็บ ทีมงานยังเห็นในประวัติ)
ALTER TABLE listings ADD COLUMN deleted_at integer;
