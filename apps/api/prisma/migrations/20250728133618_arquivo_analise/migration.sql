/*
  Warnings:

  - The primary key for the `SpedAnalise` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `arquivoNome` on the `SpedAnalise` table. All the data in the column will be lost.
  - You are about to drop the column `dataProcessado` on the `SpedAnalise` table. All the data in the column will be lost.
  - You are about to drop the column `storeId` on the `SpedAnalise` table. All the data in the column will be lost.
  - The `id` column on the `SpedAnalise` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `arquivoAnaliseId` to the `SpedAnalise` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "SpedAnalise" DROP CONSTRAINT "SpedAnalise_storeId_fkey";

-- AlterTable
ALTER TABLE "SpedAnalise" DROP CONSTRAINT "SpedAnalise_pkey",
DROP COLUMN "arquivoNome",
DROP COLUMN "dataProcessado",
DROP COLUMN "storeId",
ADD COLUMN     "arquivoAnaliseId" INTEGER NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "SpedAnalise_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "StatusAnalise" (
    "id" SERIAL NOT NULL,
    "descricao" TEXT NOT NULL,

    CONSTRAINT "StatusAnalise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArquivoAnalise" (
    "id" SERIAL NOT NULL,
    "dataImportacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mesRef" TIMESTAMP(3) NOT NULL,
    "arquivoNome" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "statusAnaliseId" INTEGER NOT NULL,
    "storeId" INTEGER NOT NULL,

    CONSTRAINT "ArquivoAnalise_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SpedAnalise" ADD CONSTRAINT "SpedAnalise_arquivoAnaliseId_fkey" FOREIGN KEY ("arquivoAnaliseId") REFERENCES "ArquivoAnalise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArquivoAnalise" ADD CONSTRAINT "ArquivoAnalise_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArquivoAnalise" ADD CONSTRAINT "ArquivoAnalise_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArquivoAnalise" ADD CONSTRAINT "ArquivoAnalise_statusAnaliseId_fkey" FOREIGN KEY ("statusAnaliseId") REFERENCES "StatusAnalise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
