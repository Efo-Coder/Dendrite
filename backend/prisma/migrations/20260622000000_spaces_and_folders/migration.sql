-- Clean restart of the space/folder structure: discard existing folders so the new
-- required Folder.spaceId can be added. Notes survive; their folderId is set NULL by
-- the existing SetNull foreign key when the folders are deleted.
DELETE FROM "Folder";

-- AlterTable
ALTER TABLE "Folder" ADD COLUMN     "spaceId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "spaceId" TEXT;

-- CreateTable
CREATE TABLE "Space" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT DEFAULT '#10b981',
    "icon" TEXT,
    "coverImage" TEXT,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Space_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Space_userId_idx" ON "Space"("userId");

-- CreateIndex
CREATE INDEX "Space_isPinned_idx" ON "Space"("isPinned");

-- CreateIndex
CREATE INDEX "Folder_spaceId_idx" ON "Folder"("spaceId");

-- CreateIndex
CREATE INDEX "Note_spaceId_idx" ON "Note"("spaceId");

-- AddForeignKey
ALTER TABLE "Space" ADD CONSTRAINT "Space_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE SET NULL ON UPDATE CASCADE;
