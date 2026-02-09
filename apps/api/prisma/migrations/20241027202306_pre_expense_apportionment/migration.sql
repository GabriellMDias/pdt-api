-- CreateTable
CREATE TABLE "PreExpenseApportionment" (
    "id" SERIAL NOT NULL,
    "preExpenseId" INTEGER NOT NULL,
    "costCenterId" INTEGER NOT NULL,
    "storeId" INTEGER NOT NULL,
    "percentage" DOUBLE PRECISION,
    "useParticipation" BOOLEAN,

    CONSTRAINT "PreExpenseApportionment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PreExpenseApportionment" ADD CONSTRAINT "PreExpenseApportionment_preExpenseId_fkey" FOREIGN KEY ("preExpenseId") REFERENCES "PreExpense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreExpenseApportionment" ADD CONSTRAINT "PreExpenseApportionment_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreExpenseApportionment" ADD CONSTRAINT "PreExpenseApportionment_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
