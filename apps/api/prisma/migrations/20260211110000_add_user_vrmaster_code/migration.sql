-- AlterTable
ALTER TABLE "User"
ADD COLUMN "codigoUsuarioVrMaster" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "User_codigoUsuarioVrMaster_key" ON "User"("codigoUsuarioVrMaster");