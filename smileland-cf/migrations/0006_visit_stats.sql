-- อีสานน่าอยู่ 0006 — สถิติผู้เข้าชม (ไม่เก็บ IP / ไม่ใช้คุกกี้: เก็บเฉพาะรหัสแฮชรายวันที่ย้อนกลับไม่ได้)
CREATE TABLE visits_daily (day text NOT NULL, path text NOT NULL, views integer DEFAULT 0 NOT NULL, PRIMARY KEY (day, path));
CREATE TABLE visitors_daily (day text NOT NULL, vh text NOT NULL, PRIMARY KEY (day, vh));
CREATE TABLE sources_daily (day text NOT NULL, source text NOT NULL, views integer DEFAULT 0 NOT NULL, PRIMARY KEY (day, source));
