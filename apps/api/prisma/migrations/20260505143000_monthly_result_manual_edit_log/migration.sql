-- CreateTable
CREATE TABLE "MonthlyResultManualEditLog" (
    "id" SERIAL NOT NULL,
    "monthlyResultId" INTEGER,
    "storeId" INTEGER NOT NULL,
    "costCenterId" INTEGER NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "field" TEXT NOT NULL,
    "previousValue" DOUBLE PRECISION,
    "newValue" DOUBLE PRECISION NOT NULL,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonthlyResultManualEditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MonthlyResultManualEditLog_monthlyResultId_idx" ON "MonthlyResultManualEditLog"("monthlyResultId");

-- CreateIndex
CREATE INDEX "MonthlyResultManualEditLog_storeId_month_idx" ON "MonthlyResultManualEditLog"("storeId", "month");

-- CreateIndex
CREATE INDEX "MonthlyResultManualEditLog_costCenterId_month_idx" ON "MonthlyResultManualEditLog"("costCenterId", "month");

-- CreateIndex
CREATE INDEX "MonthlyResultManualEditLog_field_idx" ON "MonthlyResultManualEditLog"("field");
