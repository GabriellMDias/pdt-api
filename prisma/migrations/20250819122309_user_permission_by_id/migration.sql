/*
  Warnings:

  - The primary key for the `UserPermission` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[userId,permissionId,storeId]` on the table `UserPermission` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "UserPermission" DROP CONSTRAINT "UserPermission_pkey",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD COLUMN     "storeId" INTEGER,
ADD CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "UserPermission_userId_permissionId_storeId_key" ON "UserPermission"("userId", "permissionId", "storeId");

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
