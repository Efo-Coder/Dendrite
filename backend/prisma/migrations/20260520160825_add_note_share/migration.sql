-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "title" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarUrl" TEXT;

-- CreateTable
CREATE TABLE "NoteOrder" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contextType" TEXT NOT NULL,
    "contextId" TEXT NOT NULL DEFAULT '_none',
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NoteOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NoteOrder_userId_contextType_contextId_idx" ON "NoteOrder"("userId", "contextType", "contextId");

-- CreateIndex
CREATE UNIQUE INDEX "NoteOrder_noteId_userId_contextType_contextId_key" ON "NoteOrder"("noteId", "userId", "contextType", "contextId");

-- CreateIndex
CREATE INDEX "Note_isArchived_idx" ON "Note"("isArchived");

-- CreateIndex
CREATE INDEX "Note_isDeleted_idx" ON "Note"("isDeleted");

-- CreateIndex
CREATE INDEX "Note_order_idx" ON "Note"("order");

-- AddForeignKey
ALTER TABLE "NoteOrder" ADD CONSTRAINT "NoteOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
