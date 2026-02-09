-- DropForeignKey
ALTER TABLE "ExpenseApportionment" DROP CONSTRAINT "ExpenseApportionment_costCenterId_fkey";

-- AddForeignKey
ALTER TABLE "ExpenseApportionment" ADD CONSTRAINT "ExpenseApportionment_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
