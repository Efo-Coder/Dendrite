-- Persisted Yjs doc state per note: the collab server loads it when the first
-- client joins, so two clients simultaneously joining a fresh doc no longer
-- both client-seed an empty document (split-brain race).
ALTER TABLE "Note" ADD COLUMN IF NOT EXISTS "yjsState" BYTEA;
