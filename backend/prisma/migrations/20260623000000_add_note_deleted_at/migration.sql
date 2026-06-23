-- AlterTable: deletion timestamp so trashed notes can auto-expire after 30 days
ALTER TABLE "Note" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- Backfill: existing trashed notes start their 30-day timer now (no original delete time exists)
UPDATE "Note" SET "deletedAt" = CURRENT_TIMESTAMP WHERE "isDeleted" = true;
