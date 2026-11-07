CREATE TABLE `admins` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`pass_hash` text NOT NULL,
	`salt` text NOT NULL,
	`iterations` integer NOT NULL,
	`must_change` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`last_login_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admins_username` ON `admins` (`username`);--> statement-breakpoint
CREATE TABLE `districts` (
	`code` integer PRIMARY KEY NOT NULL,
	`province_code` integer NOT NULL,
	`name_th` text NOT NULL,
	`name_en` text NOT NULL,
	`slug` text NOT NULL,
	`postal_code` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `districts_prov_slug` ON `districts` (`province_code`,`slug`);--> statement-breakpoint
CREATE TABLE `leads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`listing_id` integer,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`line` text,
	`email` text,
	`message` text,
	`meta` text,
	`status` text DEFAULT 'new' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `leads_status` ON `leads` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `leads_listing` ON `leads` (`listing_id`);--> statement-breakpoint
CREATE TABLE `listing_images` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`listing_id` integer NOT NULL,
	`idx` integer NOT NULL,
	`key_base` text NOT NULL,
	`ext` text DEFAULT 'webp' NOT NULL,
	`width` integer,
	`height` integer
);
--> statement-breakpoint
CREATE INDEX `listing_images_listing` ON `listing_images` (`listing_id`,`idx`);--> statement-breakpoint
CREATE TABLE `listing_tokens` (
	`token` text NOT NULL,
	`listing_id` integer NOT NULL,
	PRIMARY KEY(`token`, `listing_id`)
);
--> statement-breakpoint
CREATE INDEX `listing_tokens_listing` ON `listing_tokens` (`listing_id`);--> statement-breakpoint
CREATE TABLE `listings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ref` text NOT NULL,
	`deal` text NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`reject_reason` text,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`price` integer NOT NULL,
	`province_code` integer NOT NULL,
	`district_code` integer NOT NULL,
	`subdistrict_code` integer,
	`address_note` text,
	`lat` real,
	`lng` real,
	`land_rai` real,
	`land_ngan` real,
	`land_wah` real,
	`land_sqw` real,
	`deed_type` text,
	`frontage_m` real,
	`zoning_color` text,
	`usable_sqm` real,
	`bedrooms` integer,
	`bathrooms` integer,
	`floors` integer,
	`parking` integer,
	`project_name` text,
	`floor_no` integer,
	`common_fee` integer,
	`deposit_months` integer,
	`min_contract_months` integer,
	`furnished` integer,
	`features` text,
	`cover_key` text,
	`image_count` integer DEFAULT 0 NOT NULL,
	`poster_role` text DEFAULT 'owner' NOT NULL,
	`owner_name` text NOT NULL,
	`owner_phone` text NOT NULL,
	`owner_line` text,
	`owner_email` text,
	`deed_no` text,
	`consign` integer DEFAULT 0 NOT NULL,
	`manage_token_hash` text NOT NULL,
	`featured` integer DEFAULT 0 NOT NULL,
	`views` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`approved_at` integer,
	`expires_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `listings_ref` ON `listings` (`ref`);--> statement-breakpoint
CREATE INDEX `listings_browse` ON `listings` (`status`,`deal`,`type`,`province_code`,`district_code`);--> statement-breakpoint
CREATE INDEX `listings_status_created` ON `listings` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `listings_status_price` ON `listings` (`status`,`price`);--> statement-breakpoint
CREATE INDEX `listings_featured` ON `listings` (`status`,`featured`);--> statement-breakpoint
CREATE TABLE `price_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`listing_id` integer NOT NULL,
	`price` integer NOT NULL,
	`changed_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `price_history_listing` ON `price_history` (`listing_id`);--> statement-breakpoint
CREATE TABLE `provinces` (
	`code` integer PRIMARY KEY NOT NULL,
	`name_th` text NOT NULL,
	`name_en` text NOT NULL,
	`slug` text NOT NULL,
	`region` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `provinces_slug` ON `provinces` (`slug`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `subdistricts` (
	`code` integer PRIMARY KEY NOT NULL,
	`district_code` integer NOT NULL,
	`province_code` integer NOT NULL,
	`name_th` text NOT NULL,
	`name_en` text NOT NULL,
	`postal_code` text
);
--> statement-breakpoint
CREATE INDEX `subdistricts_district` ON `subdistricts` (`district_code`);--> statement-breakpoint
CREATE TABLE `timeline` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`listing_id` integer NOT NULL,
	`event` text NOT NULL,
	`note` text,
	`actor` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `timeline_listing` ON `timeline` (`listing_id`);