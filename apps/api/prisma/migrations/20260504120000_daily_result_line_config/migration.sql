-- CreateEnum
CREATE TYPE "DailyResultLineSourceType" AS ENUM ('DIRECT_FIELD', 'PARTICIPATION', 'SUM', 'GROUP', 'DRE_VRMASTER');

-- CreateEnum
CREATE TYPE "DailyResultLineFormat" AS ENUM ('money', 'percent');

-- CreateTable
CREATE TABLE "DailyResultLineConfig" (
    "id" SERIAL NOT NULL,
    "lineId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "sourceType" "DailyResultLineSourceType" NOT NULL,
    "format" "DailyResultLineFormat",
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "bold" BOOLEAN NOT NULL DEFAULT false,
    "shade" BOOLEAN NOT NULL DEFAULT false,
    "sourceConfig" JSONB,
    "calculationConfig" JSONB,
    "styleConfig" JSONB,
    "vrDreId" INTEGER,
    "vrDreItemId" INTEGER,
    "vrDreType" TEXT,
    "vrDreTotalizationType" TEXT,
    "detailConfig" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyResultLineConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyResultLineConfig_lineId_key" ON "DailyResultLineConfig"("lineId");

-- CreateIndex
CREATE INDEX "DailyResultLineConfig_active_visible_order_idx" ON "DailyResultLineConfig"("active", "visible", "order");

-- CreateIndex
CREATE INDEX "DailyResultLineConfig_sourceType_idx" ON "DailyResultLineConfig"("sourceType");
