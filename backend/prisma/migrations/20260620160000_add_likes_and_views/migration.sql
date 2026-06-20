-- AlterTable
ALTER TABLE "published_notes" ADD COLUMN     "likeCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "viewCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "published_note_likes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "publishedNoteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "published_note_likes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "published_note_likes_userId_idx" ON "published_note_likes"("userId");

-- CreateIndex
CREATE INDEX "published_note_likes_publishedNoteId_idx" ON "published_note_likes"("publishedNoteId");

-- CreateIndex
CREATE UNIQUE INDEX "published_note_likes_userId_publishedNoteId_key" ON "published_note_likes"("userId", "publishedNoteId");

-- CreateIndex
CREATE INDEX "published_notes_likeCount_idx" ON "published_notes"("likeCount");

-- AddForeignKey
ALTER TABLE "published_note_likes" ADD CONSTRAINT "published_note_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "published_note_likes" ADD CONSTRAINT "published_note_likes_publishedNoteId_fkey" FOREIGN KEY ("publishedNoteId") REFERENCES "published_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
