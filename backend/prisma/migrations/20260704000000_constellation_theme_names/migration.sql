-- Emergent constellation themes get one Claude-generated display name each,
-- persisted so the arbor keeps its names across graph rebuilds and deploys.
-- IF NOT EXISTS + guarded FK because prod applies the schema via db push on
-- container start, so this migration may run against an existing table.

CREATE TABLE IF NOT EXISTS "constellation_theme_names" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "constellation_theme_names_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "constellation_theme_names_userId_themeId_key"
    ON "constellation_theme_names"("userId", "themeId");

DO $$ BEGIN
    ALTER TABLE "constellation_theme_names"
        ADD CONSTRAINT "constellation_theme_names_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
