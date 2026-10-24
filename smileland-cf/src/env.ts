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
};

export type Job =
  | { kind: 'sitemap'; provinceCode: number }
  | { kind: 'sitemap-index' }
  | { kind: 'purge-images'; listingId: number };

export type AdminSession = { adminId: number; username: string; mustChange: boolean; csrf: string };

export type AppEnv = {
  Bindings: Bindings;
  Variables: {
    admin?: AdminSession;
    settings: Record<string, string>;
  };
};
