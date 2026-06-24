-- Rename Tag → Bookmark (data-preserving physical rename).
-- Prisma's migrate diff cannot detect renames (would DROP+CREATE and lose data),
-- so this migration is hand-written with ALTER … RENAME. Verified against the live
-- schema: the resulting table/column/constraint/index names match exactly what
-- Prisma generates for the renamed models.

-- Tables
ALTER TABLE "Tag" RENAME TO "Bookmark";
ALTER TABLE "NoteTag" RENAME TO "NoteBookmark";
ALTER TABLE "user_note_tags" RENAME TO "user_note_bookmarks";

-- Columns
ALTER TABLE "NoteBookmark" RENAME COLUMN "tagId" TO "bookmarkId";
ALTER TABLE "user_note_bookmarks" RENAME COLUMN "tagId" TO "bookmarkId";

-- Primary keys (renaming the constraint also renames its backing index)
ALTER TABLE "Bookmark" RENAME CONSTRAINT "Tag_pkey" TO "Bookmark_pkey";
ALTER TABLE "NoteBookmark" RENAME CONSTRAINT "NoteTag_pkey" TO "NoteBookmark_pkey";
ALTER TABLE "user_note_bookmarks" RENAME CONSTRAINT "user_note_tags_pkey" TO "user_note_bookmarks_pkey";

-- Foreign keys
ALTER TABLE "Bookmark" RENAME CONSTRAINT "Tag_userId_fkey" TO "Bookmark_userId_fkey";
ALTER TABLE "NoteBookmark" RENAME CONSTRAINT "NoteTag_noteId_fkey" TO "NoteBookmark_noteId_fkey";
ALTER TABLE "NoteBookmark" RENAME CONSTRAINT "NoteTag_tagId_fkey" TO "NoteBookmark_bookmarkId_fkey";
ALTER TABLE "user_note_bookmarks" RENAME CONSTRAINT "user_note_tags_noteId_fkey" TO "user_note_bookmarks_noteId_fkey";
ALTER TABLE "user_note_bookmarks" RENAME CONSTRAINT "user_note_tags_tagId_fkey" TO "user_note_bookmarks_bookmarkId_fkey";
ALTER TABLE "user_note_bookmarks" RENAME CONSTRAINT "user_note_tags_userId_fkey" TO "user_note_bookmarks_userId_fkey";

-- Secondary indexes
ALTER INDEX "Tag_userId_idx" RENAME TO "Bookmark_userId_idx";
ALTER INDEX "Tag_name_userId_key" RENAME TO "Bookmark_name_userId_key";
ALTER INDEX "NoteTag_noteId_idx" RENAME TO "NoteBookmark_noteId_idx";
ALTER INDEX "NoteTag_tagId_idx" RENAME TO "NoteBookmark_bookmarkId_idx";
ALTER INDEX "user_note_tags_noteId_userId_idx" RENAME TO "user_note_bookmarks_noteId_userId_idx";
