-- CreateTable
CREATE TABLE "published_notes" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "coverImage" TEXT,
    "tags" TEXT[],
    "topics" TEXT[],
    "readingTime" INTEGER NOT NULL DEFAULT 1,
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "published_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "published_notes_noteId_key" ON "published_notes"("noteId");

-- CreateIndex
CREATE INDEX "published_notes_ownerId_idx" ON "published_notes"("ownerId");

-- CreateIndex
CREATE INDEX "published_notes_publishedAt_idx" ON "published_notes"("publishedAt");

-- CreateIndex
CREATE INDEX "published_notes_visibility_idx" ON "published_notes"("visibility");

-- AddForeignKey
ALTER TABLE "published_notes" ADD CONSTRAINT "published_notes_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "published_notes" ADD CONSTRAINT "published_notes_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;
