CREATE TABLE IF NOT EXISTS drafts(id text PRIMARY KEY,revision integer NOT NULL DEFAULT 1,owner text NOT NULL,payload text NOT NULL,fingerprint text NOT NULL,created_at double precision NOT NULL,expires_at double precision NOT NULL);
CREATE TABLE IF NOT EXISTS operations(id text PRIMARY KEY,draft_revision integer NOT NULL,draft_id text NOT NULL UNIQUE,owner text NOT NULL,fingerprint text NOT NULL UNIQUE,status text NOT NULL,issue_key text,created_at double precision NOT NULL,updated_at double precision NOT NULL);
CREATE TABLE IF NOT EXISTS audit(id text PRIMARY KEY,trace_id text NOT NULL,actor text NOT NULL,event text NOT NULL,code text NOT NULL,created_at double precision NOT NULL);
CREATE TABLE IF NOT EXISTS budget(key text PRIMARY KEY,count integer NOT NULL,expires_at double precision NOT NULL);
CREATE INDEX IF NOT EXISTS operations_owner_time ON operations(owner,created_at);
CREATE INDEX IF NOT EXISTS operations_time ON operations(created_at);
CREATE OR REPLACE FUNCTION guard_operation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(739102601);
 PERFORM 1 FROM drafts WHERE id=NEW.draft_id AND owner=NEW.owner AND fingerprint=NEW.fingerprint AND revision=NEW.draft_revision AND expires_at>=NEW.created_at FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'DRAFT_STALE'; END IF;
 -- Dedup is checked before quotas so a replay does not consume a new attempt.
 IF EXISTS(SELECT 1 FROM operations WHERE draft_id=NEW.draft_id OR fingerprint=NEW.fingerprint) THEN RAISE unique_violation USING MESSAGE='duplicate operation'; END IF;
 IF (SELECT count(*) FROM operations WHERE owner=NEW.owner AND created_at>NEW.created_at-60000)>=3 THEN RAISE EXCEPTION 'QUOTA_MINUTE'; END IF;
 IF (SELECT count(*) FROM operations WHERE owner=NEW.owner AND created_at>NEW.created_at-86400000)>=10 THEN RAISE EXCEPTION 'QUOTA_USER_DAY'; END IF;
 IF (SELECT count(*) FROM operations WHERE created_at>NEW.created_at-86400000)>=25 THEN RAISE EXCEPTION 'QUOTA_GLOBAL_DAY'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS operations_guard ON operations;
CREATE TRIGGER operations_guard BEFORE INSERT ON operations FOR EACH ROW EXECUTE FUNCTION guard_operation();
