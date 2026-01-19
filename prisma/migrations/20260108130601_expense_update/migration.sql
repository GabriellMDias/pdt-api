/*
  Warnings:

  - Added the required column `isActived` to the `PreExpense` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "expenseTypeId" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PreExpense" ADD COLUMN     "expenseTypeId" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isActived" BOOLEAN NOT NULL;

-- CreateTable
CREATE TABLE "ExpenseType" (
    "id" SERIAL NOT NULL,
    "description" TEXT NOT NULL,
    "isActived" BOOLEAN NOT NULL,

    CONSTRAINT "ExpenseType_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_expenseTypeId_fkey" FOREIGN KEY ("expenseTypeId") REFERENCES "ExpenseType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreExpense" ADD CONSTRAINT "PreExpense_expenseTypeId_fkey" FOREIGN KEY ("expenseTypeId") REFERENCES "ExpenseType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
