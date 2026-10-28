-- เข้าสู่ระบบด้วย LINE: ผูกบัญชีสมาชิกกับ LINE user id (sub)
ALTER TABLE users ADD COLUMN line_sub TEXT;
ALTER TABLE users ADD COLUMN line_picture TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS users_line_sub ON users(line_sub) WHERE line_sub IS NOT NULL;
