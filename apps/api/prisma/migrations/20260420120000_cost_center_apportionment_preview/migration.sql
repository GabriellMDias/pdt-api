-- CreateTable
CREATE TABLE "CostCenterApportionmentPreviewRun" (
    "id" SERIAL NOT NULL,
    "codeJobRunId" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'JOB',
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "summary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CostCenterApportionmentPreviewRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostCenterApportionmentPreviewItem" (
    "id" SERIAL NOT NULL,
    "previewRunId" INTEGER NOT NULL,
    "noteExpenseId" INTEGER NOT NULL,
    "storeId" INTEGER,
    "supplierId" INTEGER,
    "supplierName" TEXT,
    "entryDate" TIMESTAMP(3),
    "competence" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "effectiveCostCenterTypeVrId" INTEGER,
    "effectiveCostCenterTypeId" INTEGER,
    "warnings" JSONB,
    "details" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CostCenterApportionmentPreviewItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CostCenterApportionmentPreviewRun_codeJobRunId_idx" ON "CostCenterApportionmentPreviewRun"("codeJobRunId");

-- CreateIndex
CREATE INDEX "CostCenterApportionmentPreviewRun_createdAt_idx" ON "CostCenterApportionmentPreviewRun"("createdAt");

-- CreateIndex
CREATE INDEX "CostCenterApportionmentPreviewItem_previewRunId_idx" ON "CostCenterApportionmentPreviewItem"("previewRunId");

-- CreateIndex
CREATE INDEX "CostCenterApportionmentPreviewItem_noteExpenseId_idx" ON "CostCenterApportionmentPreviewItem"("noteExpenseId");

-- CreateIndex
CREATE INDEX "CostCenterApportionmentPreviewItem_status_idx" ON "CostCenterApportionmentPreviewItem"("status");

-- AddForeignKey
ALTER TABLE "CostCenterApportionmentPreviewItem" ADD CONSTRAINT "CostCenterApportionmentPreviewItem_previewRunId_fkey" FOREIGN KEY ("previewRunId") REFERENCES "CostCenterApportionmentPreviewRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
