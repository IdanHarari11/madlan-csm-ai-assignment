CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`trace_id` text NOT NULL,
	`actor` text NOT NULL,
	`event` text NOT NULL,
	`code` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `budget` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`payload` text NOT NULL,
	`fingerprint` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `operations` (
	`id` text PRIMARY KEY NOT NULL,
	`draft_id` text NOT NULL,
	`owner` text NOT NULL,
	`fingerprint` text NOT NULL,
	`status` text NOT NULL,
	`issue_key` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `operations_draft_id_unique` ON `operations` (`draft_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `operations_fingerprint_unique` ON `operations` (`fingerprint`);
--> statement-breakpoint
CREATE INDEX operations_owner_time ON operations(owner,created_at);
--> statement-breakpoint
CREATE INDEX operations_time ON operations(created_at);
--> statement-breakpoint
CREATE TRIGGER operations_guard BEFORE INSERT ON operations BEGIN
 SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM drafts WHERE id=NEW.draft_id AND owner=NEW.owner AND fingerprint=NEW.fingerprint AND expires_at>=NEW.created_at) THEN RAISE(ABORT,'DRAFT_STALE') END;
 SELECT CASE WHEN (SELECT count(*) FROM operations WHERE owner=NEW.owner AND created_at>NEW.created_at-60000)>=3 THEN RAISE(ABORT,'QUOTA_MINUTE') END;
 SELECT CASE WHEN (SELECT count(*) FROM operations WHERE owner=NEW.owner AND created_at>NEW.created_at-86400000)>=10 THEN RAISE(ABORT,'QUOTA_USER_DAY') END;
 SELECT CASE WHEN (SELECT count(*) FROM operations WHERE created_at>NEW.created_at-86400000)>=25 THEN RAISE(ABORT,'QUOTA_GLOBAL_DAY') END;
END;
