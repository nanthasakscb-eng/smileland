export type Bindings = {
  DB: D1Database;
  UPLOADS: R2Bucket;
  SESSIONS: KVNamespace;
  RATELIMIT: KVNamespace;
  JOBS: Queue<Job>;
  ASSETS: Fetcher;

  SITE_NAME: string;
  SITE_URL: string;
  IMG_BASE: string;
  TURNSTILE_SITE_KEY: string;
  LISTING_TTL_DAYS: string;
  THIN_PAGE_MIN: string;

  // secrets (wrangler secret put / .dev.vars)
  TURNSTILE_SECRET_KEY?: string;
  ADMIN_INITIAL_PASSWORD?: string;
  RESEND_API_KEY?: string; // ส่งอีเมลผ่าน Resend (ถ้าไม่ตั้ง อีเมลจะไปอยู่ใน /admin/outbox)
  MAIL_FROM?: string;      // เช่น "อีสานน่าอยู่ <no-reply@yourdomain.com>"
  LINE_LOGIN_CHANNEL_ID?: string;     // LINE Login channel (developers.line.biz) — ตั้งผ่าน set-keys.bat
  LINE_LOGIN_CHANNEL_SECRET?: string;
};

export type Job =
  | { kind: 'sitemap'; provinceCode: number }
  | { kind: 'sitemap-index' }
  | { kind: 'purge-images'; listingId: number };

export type AdminSession = { adminId: number; username: string; mustChange: boolean; csrf: string; isOwner?: boolean; perms?: string[] };
export type UserSession = { userId: number; email: string; name: string; verified: boolean; csrf: string };

export type AppEnv = {
  Bindings: Bindings;
  Variables: {
    admin?: AdminSession;
    user?: UserSession;
    settings: Record<string, string>;
  };
};
