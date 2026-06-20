-- Backfill: mirror existing pending collaboration invites into the new bell feed,
-- so they don't disappear once the bell reads from notifications.
INSERT INTO "notifications" ("id", "userId", "type", "data", "read", "createdAt")
SELECT
  gen_random_uuid(),
  nc."userId",
  'collab_invite',
  jsonb_build_object(
    'collaboratorId', nc."id",
    'noteId', n."id",
    'noteTitle', n."title",
    'fromName', u."name"
  ),
  false,
  nc."invitedAt"
FROM "note_collaborators" nc
JOIN "Note" n ON n."id" = nc."noteId"
JOIN "User" u ON u."id" = n."userId"
WHERE nc."status" = 'pending';
