-- AlterTable: password optional, provider fields hinzufügen
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN "provider" TEXT;
ALTER TABLE "User" ADD COLUMN "providerId" TEXT;

-- CreateIndex: unique constraint auf (provider, providerId), NULLs sind erlaubt
CREATE UNIQUE INDEX "User_provider_providerId_key" ON "User"("provider", "providerId");
