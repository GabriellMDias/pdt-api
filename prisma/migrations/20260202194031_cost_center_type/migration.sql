-- CreateTable
CREATE TABLE "CostCenterType" (
    "id" SERIAL NOT NULL,
    "description" TEXT NOT NULL,
    "id_costcentertype_vr" INTEGER NOT NULL,
    "codcencus_sankhya" INTEGER,
    "useParticipationStore" BOOLEAN NOT NULL,
    "useParticiparionCostCenter" BOOLEAN NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CostCenterType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostCenterTypeItem" (
    "id" SERIAL NOT NULL,
    "costCenterTypeId" INTEGER NOT NULL,
    "costCenterId" INTEGER,
    "storeId" INTEGER,
    "percentage" DOUBLE PRECISION,
    "participation" BOOLEAN,

    CONSTRAINT "CostCenterTypeItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CostCenterType_id_costcentertype_vr_key" ON "CostCenterType"("id_costcentertype_vr");

-- CreateIndex
CREATE UNIQUE INDEX "CostCenterType_codcencus_sankhya_key" ON "CostCenterType"("codcencus_sankhya");

-- AddForeignKey
ALTER TABLE "CostCenterTypeItem" ADD CONSTRAINT "CostCenterTypeItem_costCenterTypeId_fkey" FOREIGN KEY ("costCenterTypeId") REFERENCES "CostCenterType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostCenterTypeItem" ADD CONSTRAINT "CostCenterTypeItem_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostCenterTypeItem" ADD CONSTRAINT "CostCenterTypeItem_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
