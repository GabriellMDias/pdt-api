-- CreateEnum
CREATE TYPE "MobileAppPlatform" AS ENUM ('ANDROID');

-- CreateTable
CREATE TABLE "MobileAppRelease" (
    "id" SERIAL NOT NULL,
    "platform" "MobileAppPlatform" NOT NULL,
    "versionName" TEXT NOT NULL,
    "buildNumber" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "downloadFilename" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" BIGINT NOT NULL,
    "sha256" TEXT NOT NULL,
    "changelog" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isLatest" BOOLEAN NOT NULL DEFAULT false,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" INTEGER,

    CONSTRAINT "MobileAppRelease_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MobileAppRelease_platform_buildNumber_key" ON "MobileAppRelease"("platform", "buildNumber");

-- CreateIndex
CREATE INDEX "MobileAppRelease_platform_isLatest_publishedAt_idx" ON "MobileAppRelease"("platform", "isLatest", "publishedAt" DESC);

-- CreateIndex
CREATE INDEX "MobileAppRelease_platform_isPublished_createdAt_idx" ON "MobileAppRelease"("platform", "isPublished", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "MobileAppRelease" ADD CONSTRAINT "MobileAppRelease_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
