/*
  Warnings:

  - A unique constraint covering the columns `[cnpj]` on the table `Store` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `cnpj` to the `Store` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "cnpj" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "AnalysisType" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AnalysisType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpedAnalise" (
    "id" TEXT NOT NULL,
    "dataProcessado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resultadoJson" JSONB NOT NULL,
    "arquivoNome" TEXT NOT NULL,
    "analysisTypeId" INTEGER NOT NULL,
    "storeId" INTEGER NOT NULL,

    CONSTRAINT "SpedAnalise_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnalysisType_code_key" ON "AnalysisType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Store_cnpj_key" ON "Store"("cnpj");

-- AddForeignKey
ALTER TABLE "SpedAnalise" ADD CONSTRAINT "SpedAnalise_analysisTypeId_fkey" FOREIGN KEY ("analysisTypeId") REFERENCES "AnalysisType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpedAnalise" ADD CONSTRAINT "SpedAnalise_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
