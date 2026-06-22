-- AlterTable
ALTER TABLE "Folder" ADD COLUMN     "isPinned" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Folder_isPinned_idx" ON "Folder"("isPinned");
