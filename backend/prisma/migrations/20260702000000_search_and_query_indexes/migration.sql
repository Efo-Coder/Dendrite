-- Search + query-shape indexes.
--
-- 1) pg_trgm GIN indexes make every ILIKE '%q%' search (in-note search, Explore
--    q-filter, people search) index-assisted instead of a sequential scan.
-- 2) Note's single-column boolean indexes are dropped: the planner never picks
--    them (too unselective) but every autosave had to maintain all of them.
--    Replaced by one composite that matches the list query's filter + sort.

CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Note: composite for the list query (userId filter, pinned-first/recency sort)
DROP INDEX IF EXISTS "Note_userId_idx";
DROP INDEX IF EXISTS "Note_isPinned_idx";
DROP INDEX IF EXISTS "Note_isFavorite_idx";
DROP INDEX IF EXISTS "Note_isArchived_idx";
DROP INDEX IF EXISTS "Note_isDeleted_idx";
DROP INDEX IF EXISTS "Note_order_idx";
CREATE INDEX IF NOT EXISTS "Note_userId_isPinned_updatedAt_idx" ON "Note"("userId", "isPinned" DESC, "updatedAt" DESC);
CREATE INDEX IF NOT EXISTS "Note_isDeleted_deletedAt_idx" ON "Note"("isDeleted", "deletedAt");
CREATE INDEX IF NOT EXISTS "Note_content_idx" ON "Note" USING GIN ("content" gin_trgm_ops);

-- Space / Folder: pinned flag alone is never a useful access path
DROP INDEX IF EXISTS "Space_isPinned_idx";
DROP INDEX IF EXISTS "Folder_isPinned_idx";

-- Explore search + array filters
CREATE INDEX IF NOT EXISTS "published_notes_title_idx" ON "published_notes" USING GIN ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "published_notes_content_idx" ON "published_notes" USING GIN ("content" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "published_notes_tags_idx" ON "published_notes" USING GIN ("tags");
CREATE INDEX IF NOT EXISTS "published_notes_topics_idx" ON "published_notes" USING GIN ("topics");

-- Trending: group the recent like window by note
CREATE INDEX IF NOT EXISTS "published_note_likes_createdAt_idx" ON "published_note_likes"("createdAt");

-- People search: contains on name/username
CREATE INDEX IF NOT EXISTS "User_name_idx" ON "User" USING GIN ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "User_username_idx" ON "User" USING GIN ("username" gin_trgm_ops);
