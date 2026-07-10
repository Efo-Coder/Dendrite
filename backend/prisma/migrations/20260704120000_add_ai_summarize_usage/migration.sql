-- Monthly AI-summarize quota per user. IF NOT EXISTS because prod applies the
-- schema via db push on container start, so this migration may run against
-- columns that already exist.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "aiSummarizeMonth" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "aiSummarizeCount" INTEGER NOT NULL DEFAULT 0;
