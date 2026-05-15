-- CreateEnum
CREATE TYPE "MonthlyResultConsolidationStatus" AS ENUM ('NOT_CONSOLIDATED', 'CONSOLIDATED', 'REVERSED');

-- CreateTable
CREATE TABLE "MonthlyResultConsolidation" (
    "id" SERIAL NOT NULL,
    "storeId" INTEGER NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "status" "MonthlyResultConsolidationStatus" NOT NULL DEFAULT 'NOT_CONSOLIDATED',
    "consolidatedAt" TIMESTAMP(3),
    "consolidatedByUserId" INTEGER,
    "reversedAt" TIMESTAMP(3),
    "reversedByUserId" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyResultConsolidation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyResultConsolidation_storeId_month_key" ON "MonthlyResultConsolidation"("storeId", "month");

-- CreateIndex
CREATE INDEX "MonthlyResultConsolidation_month_status_idx" ON "MonthlyResultConsolidation"("month", "status");

-- CreateIndex
CREATE INDEX "MonthlyResultConsolidation_storeId_status_idx" ON "MonthlyResultConsolidation"("storeId", "status");

-- AddForeignKey
ALTER TABLE "MonthlyResultConsolidation" ADD CONSTRAINT "MonthlyResultConsolidation_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyResultConsolidation" ADD CONSTRAINT "MonthlyResultConsolidation_consolidatedByUserId_fkey" FOREIGN KEY ("consolidatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyResultConsolidation" ADD CONSTRAINT "MonthlyResultConsolidation_reversedByUserId_fkey" FOREIGN KEY ("reversedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
