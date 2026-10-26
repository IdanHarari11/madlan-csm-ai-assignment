-- Repair only exact synthetic fixtures from the initial pooled-connection test.
-- Real drafts contain a validated DraftPayload and a SHA-256 fingerprint, never
-- the payloads/fingerprints below. No real Jira service was used by these tests.
DELETE FROM public.operations o USING public.drafts d WHERE o.draft_id=d.id AND (
 (d.payload='{}' AND d.fingerprint='fp-'||d.id AND (d.owner=d.id OR d.owner='same-owner'))
 OR (d.payload='updated' AND d.fingerprint='edited-fp' AND d.owner=d.id));
DELETE FROM public.drafts WHERE
 (payload='{}' AND fingerprint='fp-'||id AND (owner=id OR owner='same-owner'))
 OR (payload='updated' AND fingerprint='edited-fp' AND owner=id);
DELETE FROM public.budget WHERE key='concurrent-test';
