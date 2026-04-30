-- Extend preview items to support notaentrada grouped by id_tipoentrada.
ALTER TABLE "CostCenterApportionmentPreviewItem"
  ADD COLUMN "documentSource" TEXT NOT NULL DEFAULT 'NOTA_DESPESA',
  ADD COLUMN "noteEntryId" INTEGER,
  ADD COLUMN "entryTypeId" INTEGER,
  ALTER COLUMN "noteExpenseId" DROP NOT NULL;

CREATE INDEX "CostCenterApportionmentPreviewItem_noteEntryId_idx" ON "CostCenterApportionmentPreviewItem"("noteEntryId");
CREATE INDEX "CostCenterApportionmentPreviewItem_documentSource_idx" ON "CostCenterApportionmentPreviewItem"("documentSource");
CREATE INDEX "CostCenterApportionmentPreviewItem_entryTypeId_idx" ON "CostCenterApportionmentPreviewItem"("entryTypeId");
