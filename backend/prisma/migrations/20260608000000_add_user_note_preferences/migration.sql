-- CreateTable
CREATE TABLE "user_note_preferences" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isPinned" BOOLEAN,
    "isFavorite" BOOLEAN,
    "folderId" TEXT,
    "folderOverrideSet" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_note_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_note_tags" (
    "noteId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_note_tags_pkey" PRIMARY KEY ("noteId","tagId","userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_note_preferences_noteId_userId_key" ON "user_note_preferences"("noteId", "userId");

-- CreateIndex
CREATE INDEX "user_note_preferences_userId_idx" ON "user_note_preferences"("userId");

-- CreateIndex
CREATE INDEX "user_note_tags_noteId_userId_idx" ON "user_note_tags"("noteId", "userId");

-- AddForeignKey
ALTER TABLE "user_note_preferences" ADD CONSTRAINT "user_note_preferences_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_note_preferences" ADD CONSTRAINT "user_note_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_note_tags" ADD CONSTRAINT "user_note_tags_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_note_tags" ADD CONSTRAINT "user_note_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_note_tags" ADD CONSTRAINT "user_note_tags_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
