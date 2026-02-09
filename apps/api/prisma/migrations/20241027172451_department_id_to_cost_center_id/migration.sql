/*
  Warnings:

  - You are about to drop the column `departmentId` on the `ExpenseApportionment` table. All the data in the column will be lost.
  - You are about to drop the column `departmentId` on the `MontlyResult` table. All the data in the column will be lost.
  - Added the required column `costCenterId` to the `ExpenseApportionment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `costCenterId` to the `MontlyResult` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ExpenseApportionment" DROP CONSTRAINT "ExpenseApportionment_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "MontlyResult" DROP CONSTRAINT "MontlyResult_departmentId_fkey";

-- AlterTable
ALTER TABLE "ExpenseApportionment" DROP COLUMN "departmentId",
ADD COLUMN     "costCenterId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "MontlyResult" DROP COLUMN "departmentId",
ADD COLUMN     "costCenterId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "MontlyResult" ADD CONSTRAINT "MontlyResult_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseApportionment" ADD CONSTRAINT "ExpenseApportionment_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
