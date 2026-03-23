export type StockMovementType = 'add' | 'remove';

export type LocalMovementReason = {
  id: number;
  description: string;
  activeStatus: boolean;
  syncedAt: string;
  updatedAt: string;
};
