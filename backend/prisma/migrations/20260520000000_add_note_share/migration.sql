-- CreateTable
CREATE TABLE "note_shares" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "note_shares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "note_shares_token_key" ON "note_shares"("token");

-- CreateIndex
CREATE INDEX "note_shares_noteId_idx" ON "note_shares"("noteId");

-- AddForeignKey
ALTER TABLE "note_shares" ADD CONSTRAINT "note_shares_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;
