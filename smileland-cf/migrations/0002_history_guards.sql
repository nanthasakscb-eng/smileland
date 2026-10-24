-- SMILELAND 0002 — ประวัติราคาและไทม์ไลน์ (จดหมายเหตุ) เป็นแบบต่อท้ายเท่านั้น ห้ามแก้/ลบ
CREATE TRIGGER tl_no_update BEFORE UPDATE ON timeline BEGIN SELECT RAISE(ABORT, 'timeline is append-only'); END;
CREATE TRIGGER tl_no_delete BEFORE DELETE ON timeline BEGIN SELECT RAISE(ABORT, 'timeline is append-only'); END;
CREATE TRIGGER ph_no_update BEFORE UPDATE ON price_history BEGIN SELECT RAISE(ABORT, 'price_history is append-only'); END;
CREATE TRIGGER ph_no_delete BEFORE DELETE ON price_history BEGIN SELECT RAISE(ABORT, 'price_history is append-only'); END;

INSERT OR IGNORE INTO settings (key, value) VALUES
  ('contact_phone', ''),
  ('contact_line', ''),
  ('contact_line_url', ''),
  ('contact_email', ''),
  ('company_name', ''),
  ('company_address', ''),
  ('dpo_contact', ''),
  ('privacy_effective_date', ''),
  ('data_retention', '');
