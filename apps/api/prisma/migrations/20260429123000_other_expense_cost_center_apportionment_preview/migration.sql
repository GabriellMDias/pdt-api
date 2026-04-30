-- Extend preview items to support pagaroutrasdespesas.
ALTER TABLE "CostCenterApportionmentPreviewItem"
  ADD COLUMN "otherExpenseId" INTEGER;

CREATE INDEX "CostCenterApportionmentPreviewItem_otherExpenseId_idx" ON "CostCenterApportionmentPreviewItem"("otherExpenseId");
