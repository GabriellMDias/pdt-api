export type MobileSyncLogRoutineType =
  | "ruptura"
  | "troca"
  | "consumo"
  | "producao"
  | "balanco"
  | "outro";

export type MobileSyncLogStatus =
  | "processing"
  | "processed"
  | "temporary_error"
  | "permanent_error";

export type MobileTransmissionLog = {
  receiptId: string;
  eventId: string;
  eventType: string;
  routineType: MobileSyncLogRoutineType;
  routineLabel: string;
  aggregateType: string | null;
  aggregateKey: string | null;
  storeId: number | null;
  storeLabel: string | null;
  userId: number;
  userName: string | null;
  userEmail: string | null;
  userVrCode: number | null;
  status: MobileSyncLogStatus;
  statusLabel: string;
  result: string;
  summary: string;
  durationMs: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  deviceId: string | null;
  createdAt: string;
  processedAt: string | null;
  updatedAt: string;
  requestPayload: Record<string, unknown>;
  responsePayload: Record<string, unknown> | null;
};

export type PaginatedMobileTransmissionLogs = {
  items: MobileTransmissionLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type MobileTransmissionLogFilters = {
  initialDate?: string;
  finalDate?: string;
  userId?: number;
  routineType?: MobileSyncLogRoutineType;
  storeIds?: Array<number | string>;
};

export type MobileTransmissionLogUserOption = {
  id: number;
  name: string | null;
  email: string | null;
};
