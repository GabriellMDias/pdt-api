-- DropForeignKey
ALTER TABLE "MonthlyResult" DROP CONSTRAINT "MonthlyResult_costCenterId_fkey";

-- AddForeignKey
ALTER TABLE "MonthlyResult" ADD CONSTRAINT "MonthlyResult_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
