// อีสานน่าอยู่ — Drizzle schema (D1 / SQLite)
// ไฟล์ migration ที่ใช้งานจริงอยู่ที่ migrations/*.sql (สร้างจาก schema นี้ + trigger ที่ห้ามแก้ประวัติ)
import { sqliteTable, text, integer, real, index, uniqueIndex, primaryKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

const now = sql`(unixepoch())`;

/* ---------- ภูมิศาสตร์ (77 จังหวัด / 928 อำเภอ-เขต / 7,436 ตำบล-แขวง) ---------- */
export const provinces = sqliteTable('provinces', {
  code: integer('code').primaryKey(),
  nameTh: text('name_th').notNull(),
  nameEn: text('name_en').notNull(),
  slug: text('slug').notNull(),
  region: text('region').notNull(), // central | east | northeast | north | west | south
}, (t) => [uniqueIndex('provinces_slug').on(t.slug)]);

export const districts = sqliteTable('districts', {
  code: integer('code').primaryKey(),
  provinceCode: integer('province_code').notNull(),
  nameTh: text('name_th').notNull(),
  nameEn: text('name_en').notNull(),
  slug: text('slug').notNull(),
  postalCode: text('postal_code'),
}, (t) => [
  uniqueIndex('districts_prov_slug').on(t.provinceCode, t.slug),
]);

export const subdistricts = sqliteTable('subdistricts', {
  code: integer('code').primaryKey(),
  districtCode: integer('district_code').notNull(),
  provinceCode: integer('province_code').notNull(),
  nameTh: text('name_th').notNull(),
  nameEn: text('name_en').notNull(),
  postalCode: text('postal_code'),
}, (t) => [index('subdistricts_district').on(t.districtCode)]);

/* ---------- ประกาศ ---------- */
export const listings = sqliteTable('listings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ref: text('ref').notNull(),
  deal: text('deal', { enum: ['sale', 'rent'] }).notNull(),
  type: text('type', { enum: ['house', 'land', 'condo'] }).notNull(),
  status: text('status', { enum: ['pending', 'active', 'rejected', 'sold', 'expired', 'closed'] }).notNull().default('pending'),
  rejectReason: text('reject_reason'),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  price: integer('price').notNull(), // บาท (เช่า = บาท/เดือน)

  provinceCode: integer('province_code').notNull(),
  districtCode: integer('district_code').notNull(),
  subdistrictCode: integer('subdistrict_code'),
  addressNote: text('address_note'), // ซอย/ถนน/จุดสังเกต (สาธารณะ)
  lat: real('lat'),
  lng: real('lng'),

  // ที่ดิน / บ้าน
  landRai: real('land_rai'),
  landNgan: real('land_ngan'),
  landWah: real('land_wah'),
  landSqw: real('land_sqw'), // รวมเป็น ตร.ว. (คำนวณ)
  deedType: text('deed_type'), // chanote | ns3k | ns3 | spk | other
  frontageM: real('frontage_m'),
  zoningColor: text('zoning_color'),
  // บ้าน / คอนโด
  usableSqm: real('usable_sqm'),
  bedrooms: integer('bedrooms'),
  bathrooms: integer('bathrooms'),
  floors: integer('floors'),
  parking: integer('parking'),
  // คอนโด
  projectName: text('project_name'),
  floorNo: integer('floor_no'),
  commonFee: integer('common_fee'),
  // เช่า
  depositMonths: integer('deposit_months'),
  minContractMonths: integer('min_contract_months'),
  furnished: integer('furnished'),
  features: text('features'), // JSON array

  coverKey: text('cover_key'),
  imageCount: integer('image_count').notNull().default(0),

  // ข้อมูลส่วนตัวผู้ลงประกาศ — ห้ามแสดงหน้าเว็บสาธารณะ
  posterRole: text('poster_role', { enum: ['owner', 'agent'] }).notNull().default('owner'),
  ownerName: text('owner_name').notNull(),
  ownerPhone: text('owner_phone').notNull(),
  ownerLine: text('owner_line'),
  ownerEmail: text('owner_email'),
  deedNo: text('deed_no'),
  consign: integer('consign').notNull().default(0), // ขอใช้บริการฝากขาย/ฝากเช่า
  manageTokenHash: text('manage_token_hash').notNull(),
  userId: integer('user_id'),

  featured: integer('featured').notNull().default(0),
  revision: integer('revision').notNull().default(0),
  zone: text('zone'),
  zoneOrder: integer('zone_order').notNull().default(0),
  zoneUntil: integer('zone_until'),
  deletedAt: integer('deleted_at'),
  views: integer('views').notNull().default(0),
  createdAt: integer('created_at').notNull().default(now),
  updatedAt: integer('updated_at').notNull().default(now),
  approvedAt: integer('approved_at'),
  expiresAt: integer('expires_at'),
}, (t) => [
  uniqueIndex('listings_ref').on(t.ref),
  index('listings_browse').on(t.status, t.deal, t.type, t.provinceCode, t.districtCode),
  index('listings_status_created').on(t.status, t.createdAt),
  index('listings_status_price').on(t.status, t.price),
  index('listings_featured').on(t.status, t.featured),
]);

export const listingImages = sqliteTable('listing_images', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  listingId: integer('listing_id').notNull(),
  idx: integer('idx').notNull(),
  keyBase: text('key_base').notNull(), // listings/{id}/{idx} → {keyBase}-{400|800|1600}.{ext}
  ext: text('ext').notNull().default('webp'),
  width: integer('width'),
  height: integer('height'),
}, (t) => [index('listing_images_listing').on(t.listingId, t.idx)]);

/** ตารางคำค้นภาษาไทยที่ตัดคำแล้ว (Intl.Segmenter) — ค้นแบบ prefix ด้วย index */
export const listingTokens = sqliteTable('listing_tokens', {
  token: text('token').notNull(),
  listingId: integer('listing_id').notNull(),
}, (t) => [primaryKey({ columns: [t.token, t.listingId] }), index('listing_tokens_listing').on(t.listingId)]);

/* ---------- ประวัติ (append-only: มี trigger ห้ามแก้/ลบ) ---------- */
export const priceHistory = sqliteTable('price_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  listingId: integer('listing_id').notNull(),
  price: integer('price').notNull(),
  changedAt: integer('changed_at').notNull().default(now),
}, (t) => [index('price_history_listing').on(t.listingId)]);

export const timeline = sqliteTable('timeline', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  listingId: integer('listing_id').notNull(),
  event: text('event').notNull(),
  note: text('note'),
  actor: text('actor').notNull(), // owner | admin:<username> | system
  createdAt: integer('created_at').notNull().default(now),
}, (t) => [index('timeline_listing').on(t.listingId)]);

/* ---------- ผู้สนใจ / ติดต่อ ---------- */
export const leads = sqliteTable('leads', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  kind: text('kind', { enum: ['inquiry', 'consign', 'contact'] }).notNull(),
  listingId: integer('listing_id'),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  line: text('line'),
  email: text('email'),
  message: text('message'),
  meta: text('meta'), // JSON (เช่น ประเภททรัพย์/จังหวัดที่ฝากขาย)
  status: text('status', { enum: ['new', 'contacted', 'closed'] }).notNull().default('new'),
  createdAt: integer('created_at').notNull().default(now),
}, (t) => [index('leads_status').on(t.status, t.createdAt), index('leads_listing').on(t.listingId)]);

/* ---------- แอดมิน / ตั้งค่า ---------- */
export const admins = sqliteTable('admins', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull(),
  passHash: text('pass_hash').notNull(),
  salt: text('salt').notNull(),
  iterations: integer('iterations').notNull(),
  mustChange: integer('must_change').notNull().default(1),
  createdAt: integer('created_at').notNull().default(now),
  lastLoginAt: integer('last_login_at'),
  isOwner: integer('is_owner').notNull().default(0),
  permissions: text('permissions').notNull().default('[]'),
  displayName: text('display_name'),
}, (t) => [uniqueIndex('admins_username').on(t.username)]);

/* ---------- สมาชิก (ผู้ลงประกาศ) ---------- */
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull(),
  passHash: text('pass_hash').notNull(),
  salt: text('salt').notNull(),
  iterations: integer('iterations').notNull(),
  name: text('name').notNull(),
  phone: text('phone'),
  line: text('line'),
  emailVerifiedAt: integer('email_verified_at'),
  status: text('status', { enum: ['active', 'suspended'] }).notNull().default('active'),
  createdAt: integer('created_at').notNull().default(now),
  lastLoginAt: integer('last_login_at'),
}, (t) => [uniqueIndex('users_email').on(t.email)]);

export const emailTokens = sqliteTable('email_tokens', {
  tokenHash: text('token_hash').primaryKey(),
  userId: integer('user_id').notNull(),
  purpose: text('purpose', { enum: ['verify', 'reset'] }).notNull(),
  expiresAt: integer('expires_at').notNull(),
  usedAt: integer('used_at'),
  createdAt: integer('created_at').notNull().default(now),
});

export const outbox = sqliteTable('outbox', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  toEmail: text('to_email').notNull(),
  subject: text('subject').notNull(),
  bodyText: text('body_text').notNull(),
  kind: text('kind'),
  userId: integer('user_id'),
  status: text('status').notNull().default('queued'),
  error: text('error'),
  createdAt: integer('created_at').notNull().default(now),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export type Listing = typeof listings.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type User = typeof users.$inferSelect;
export type Admin = typeof admins.$inferSelect;
export type Province = typeof provinces.$inferSelect;
export type District = typeof districts.$inferSelect;
