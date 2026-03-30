import { PoolClient } from "pg";
import { PgService } from "src/db/pg/pg.service";

export type QueryExecutor = Pick<PoolClient, "query"> | PgService;

export type StockEntryType = 0 | 1;

export type FrozenStockFlags = {
  baixaReceita?: boolean;
  baixaAssociado?: boolean;
  baixaPerda?: boolean;
};

export type StockMovementCostInput = {
  costWithoutTax: number;
  costWithTax: number;
};

export type StockProductSnapshot = {
  productId: number;
  activeStatus: boolean;
  stockQuantity: number;
  costWithoutTax: number;
  costWithTax: number;
  averageCostWithoutTax: number;
  averageCostWithTax: number;
};

export type StockAssociationResolution = {
  originalProductId: number;
  resolvedProductId: number;
  requestedQuantity: number;
  resolvedQuantity: number;
  primaryPackageQuantity: number;
  associatedPackageQuantity: number;
  percentage: number;
};

export type CostAssociationRule = {
  sourceProductId: number;
  targetProductId: number;
  primaryPackageQuantity: number;
  associatedPackageQuantity: number;
  percentage: number;
};

export type AppliedCostUpdate = {
  productId: number;
  previousCostWithoutTax: number;
  nextCostWithoutTax: number;
  previousCostWithTax: number;
  nextCostWithTax: number;
  previousAverageCostWithoutTax: number;
  nextAverageCostWithoutTax: number;
  previousAverageCostWithTax: number;
  nextAverageCostWithTax: number;
  propagatedFromProductId: number | null;
};

export type StockMovementInput = {
  storeId: number;
  originalProductId: number;
  codigoUsuarioVrMaster: number;
  movementTypeId: number;
  quantity: number;
  stockEntryType: StockEntryType;
  updateCost?: boolean;
  costs?: StockMovementCostInput;
  stockObservation?: string;
  costObservation?: string;
  frozenStockFlags?: FrozenStockFlags;
};

export type StockMovementResult = {
  originalProductId: number;
  stockProductId: number;
  requestedQuantity: number;
  movedQuantity: number;
  stockFrozen: boolean;
  stockApplied: boolean;
  stockTargetActive: boolean;
  stockBefore: number;
  stockAfter: number | null;
  stockAssociation: StockAssociationResolution | null;
  baseCostUpdate: AppliedCostUpdate | null;
  propagatedCostUpdates: AppliedCostUpdate[];
};

export type LogTransactionInput = {
  storeId: number;
  productId: number;
  formId: number;
  transactionTypeId: number;
  codigoUsuarioVrMaster: number;
  ipTerminal?: string | null;
  observation?: string;
  referenceId?: number | null;
  alteracao?: string | null;
};
