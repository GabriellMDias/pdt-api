/*
  Warnings:

  - You are about to drop the `MontlyResult` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "MontlyResult" DROP CONSTRAINT "MontlyResult_costCenterId_fkey";

-- DropForeignKey
ALTER TABLE "MontlyResult" DROP CONSTRAINT "MontlyResult_storeId_fkey";

-- DropTable
DROP TABLE "MontlyResult";

-- CreateTable
CREATE TABLE "MonthlyResult" (
    "id" SERIAL NOT NULL,
    "storeId" INTEGER NOT NULL,
    "costCenterId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recBruta" DOUBLE PRECISION NOT NULL,
    "devolucao" DOUBLE PRECISION NOT NULL,
    "imposto" DOUBLE PRECISION NOT NULL,
    "custo" DOUBLE PRECISION NOT NULL,
    "embalagem" DOUBLE PRECISION NOT NULL,
    "quebra" DOUBLE PRECISION NOT NULL,
    "recCom" DOUBLE PRECISION NOT NULL,
    "despesaPessoal" DOUBLE PRECISION NOT NULL,
    "despesaOperacional" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "MonthlyResult_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MonthlyResult" ADD CONSTRAINT "MonthlyResult_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyResult" ADD CONSTRAINT "MonthlyResult_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
