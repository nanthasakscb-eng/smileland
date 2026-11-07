-- SMILELAND 0003 — สมาชิก (ลงประกาศ), ยืนยันอีเมล, กล่องอีเมลขาออก, สิทธิ์ทีมผู้ดูแล
CREATE TABLE users (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  email text NOT NULL,
  pass_hash text NOT NULL,
  salt text NOT NULL,
  iterations integer NOT NULL,
  name text NOT NULL,
  phone text,
  line text,
  email_verified_at integer,
  status text DEFAULT 'active' NOT NULL,          -- active | suspended
  created_at integer DEFAULT (unixepoch()) NOT NULL,
  last_login_at integer
);
CREATE UNIQUE INDEX users_email ON users (email);

CREATE TABLE email_tokens (
  token_hash text PRIMARY KEY NOT NULL,
  user_id integer NOT NULL,
  purpose text NOT NULL,                           -- verify | reset
  expires_at integer NOT NULL,
  used_at integer,
  created_at integer DEFAULT (unixepoch()) NOT NULL
);
CREATE INDEX email_tokens_user ON email_tokens (user_id, purpose);

CREATE TABLE outbox (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  to_email text NOT NULL,
  subject text NOT NULL,
  body_text text NOT NULL,
  kind text,                                       -- verify | reset | other
  user_id integer,
  status text DEFAULT 'queued' NOT NULL,           -- sent | failed | logged
  error text,
  created_at integer DEFAULT (unixepoch()) NOT NULL
);
CREATE INDEX outbox_created ON outbox (created_at);

ALTER TABLE listings ADD COLUMN user_id integer;
CREATE INDEX listings_user ON listings (user_id, created_at);

-- ทีมผู้ดูแล: is_owner = เจ้าของระบบ (ทุกสิทธิ์), permissions = JSON array ของสิทธิ์
ALTER TABLE admins ADD COLUMN is_owner integer DEFAULT 0 NOT NULL;
ALTER TABLE admins ADD COLUMN permissions text DEFAULT '[]' NOT NULL;
ALTER TABLE admins ADD COLUMN display_name text;
UPDATE admins SET is_owner = 1 WHERE id = (SELECT min(id) FROM admins);
