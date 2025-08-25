/*
  Warnings:

  - You are about to drop the `SpedAnalise` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "AnalysisDataType" AS ENUM ('string', 'int', 'decimal', 'boolean', 'date', 'datetime');

-- CreateEnum
CREATE TYPE "AnalysisGranularity" AS ENUM ('timestamp', 'day', 'month');

-- DropForeignKey
ALTER TABLE "SpedAnalise" DROP CONSTRAINT "SpedAnalise_analysisTypeId_fkey";

-- DropForeignKey
ALTER TABLE "SpedAnalise" DROP CONSTRAINT "SpedAnalise_arquivoAnaliseId_fkey";

-- DropTable
DROP TABLE "SpedAnalise";

-- CreateTable
CREATE TABLE "AnalysisField" (
    "id" SERIAL NOT NULL,
    "analysisTypeId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "dataType" "AnalysisDataType" NOT NULL,
    "nullable" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AnalysisField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisResult" (
    "id" BIGSERIAL NOT NULL,
    "analysisTypeId" INTEGER NOT NULL,
    "storeId" INTEGER,
    "bucket" TIMESTAMP(3) NOT NULL,
    "granularity" "AnalysisGranularity" NOT NULL,
    "data" JSONB NOT NULL,
    "sourceStart" TIMESTAMP(3),
    "sourceEnd" TIMESTAMP(3),
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checksum" TEXT,
    "arquivoAnaliseId" INTEGER,

    CONSTRAINT "AnalysisResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnalysisField_analysisTypeId_key_key" ON "AnalysisField"("analysisTypeId", "key");

-- CreateIndex
CREATE INDEX "AnalysisResult_storeId_bucket_granularity_idx" ON "AnalysisResult"("storeId", "bucket", "granularity");

-- CreateIndex
CREATE INDEX "AnalysisResult_analysisTypeId_bucket_granularity_idx" ON "AnalysisResult"("analysisTypeId", "bucket", "granularity");

-- CreateIndex
CREATE INDEX "AnalysisResult_arquivoAnaliseId_idx" ON "AnalysisResult"("arquivoAnaliseId");

-- CreateIndex
CREATE UNIQUE INDEX "AnalysisResult_analysisTypeId_storeId_bucket_granularity_key" ON "AnalysisResult"("analysisTypeId", "storeId", "bucket", "granularity");

-- AddForeignKey
ALTER TABLE "AnalysisField" ADD CONSTRAINT "AnalysisField_analysisTypeId_fkey" FOREIGN KEY ("analysisTypeId") REFERENCES "AnalysisType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisResult" ADD CONSTRAINT "AnalysisResult_arquivoAnaliseId_fkey" FOREIGN KEY ("arquivoAnaliseId") REFERENCES "ArquivoAnalise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisResult" ADD CONSTRAINT "AnalysisResult_analysisTypeId_fkey" FOREIGN KEY ("analysisTypeId") REFERENCES "AnalysisType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisResult" ADD CONSTRAINT "AnalysisResult_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
