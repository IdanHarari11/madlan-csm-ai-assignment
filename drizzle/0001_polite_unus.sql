ALTER TABLE `drafts` ADD `revision` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `operations` ADD `draft_revision` integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
CREATE TRIGGER operations_revision_guard BEFORE INSERT ON operations BEGIN
 SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM drafts WHERE id=NEW.draft_id AND revision=NEW.draft_revision) THEN RAISE(ABORT,'DRAFT_STALE') END;
END;
