import { useCallback } from "react";
import { api, authHeaders, API_BASE } from "../../../../services/api";
import type { CostCenter, DRE, DREByCostCenter, GetDREParams, Store } from "../types";
import type { DailyResultLineConfigDto } from "../resultado-diario.api-config";

const BASE = `${API_BASE}/api/dre`;

export type MonthlyResultConsolidationStatus =
  | "NOT_CONSOLIDATED"
  | "CONSOLIDATED"
  | "REVERSED";

export type MonthlyResultConsolidationSource =
  | "EXPLICIT_STATUS"
  | "INFERRED_FROM_MONTHLY_RESULT"
  | "NONE";

export type MonthlyResultConsolidationStatusRow = {
  storeId: number;
  storeName: string;
  month: string;
  status: MonthlyResultConsolidationStatus;
  isConsolidated: boolean;
  source: MonthlyResultConsolidationSource;
  consolidatedAt?: string | null;
  consolidatedByUserId?: number | null;
  reversedAt?: string | null;
  reversedByUserId?: number | null;
  notes?: string | null;
};

export type ReverseMonthlyResultConsolidationResponse =
  MonthlyResultConsolidationStatusRow & {
    monthlyResultRowsPreserved: number;
    monthlyResultRowsDeleted: 0;
  };

export type MonthlyResultConsolidationFilters = {
  initialMonth: string;
  finalMonth: string;
  storeIds: string[];
};

export type DailyResultEditLine = {
  id: number;
  lineId: string;
  label: string;
  order: number;
  sourceType: "DIRECT_FIELD" | "PARTICIPATION" | "SUM" | "GROUP" | "DRE_VRMASTER";
  format: "money" | "percent" | null;
  visible: boolean;
  bold: boolean;
  shade: boolean;
  sourceField: keyof DRE | null;
  editable: boolean;
  readonlyReason: string | null;
};

export type DailyResultEditCell = {
  value: number;
  editable: boolean;
  field: keyof DRE | null;
  readonlyReason: string | null;
};

export type DailyResultEditCostCenterRow = {
  costCenterId: number;
  costCenterName: string;
  activeStatus: boolean | null;
  monthlyResultId: number | null;
  hasMonthlyResult: boolean;
  duplicateMonthlyResultCount: number;
  hasDuplicateMonthlyResults: boolean;
  directValues: DRE;
  values: Record<string, number>;
  cells: Record<string, DailyResultEditCell>;
};

export type DailyResultEditValuesResponse = {
  month: string;
  storeId: number;
  storeName: string;
  sourceModel: "MonthlyResult";
  editableSourceType: "DIRECT_FIELD";
  editableFields: Array<keyof DRE>;
  calculatedLinesReadonly: boolean;
  createsMonthlyResultWhenMissing: boolean;
  affectsConsolidationInferenceWhenCreated: boolean;
  lines: DailyResultEditLine[];
  costCenters: DailyResultEditCostCenterRow[];
  total: {
    directValues: DRE;
    values: Record<string, number>;
    cells: Record<string, DailyResultEditCell>;
  };
};

export type DailyResultEditValuesFilters = {
  month: string;
  storeId: string | number;
};

export type DailyResultEditValueChange = {
  costCenterId: number;
  lineId: string;
  value: number;
};

export type DailyResultEditValuesSavePayload = {
  month: string;
  storeId: string | number;
  changes: DailyResultEditValueChange[];
};

export type DailyResultEditValuesSaveResponse = {
  month: string;
  storeId: number;
  sourceModel: "MonthlyResult";
  createdRows: number;
  updatedRows: number;
  appliedChanges: Array<{
    monthlyResultId: number;
    costCenterId: number;
    lineId: string | null;
    field: keyof DRE;
    previousValue: number | null;
    newValue: number;
    action: "CREATED" | "UPDATED";
  }>;
  skippedChanges: number;
  createsMonthlyResultWhenMissing: boolean;
  affectedConsolidationInference: boolean;
};

export type DailyResultConsolidationFiscalIntegration = {
  status: "OK" | "ERROR";
  missingDates: string[];
  notFinalizedDates: string[];
};

export type DailyResultConsolidationDryRunCostCenter = {
  storeId: number;
  costCenterId: number;
  currentValue: number;
  participation: number;
  vrMasterValue?: number;
  vrMasterAllocatedValue?: number;
  unallocatedAdjustment?: number;
  adjustment: number;
  consolidatedValue: number;
};

export type DailyResultConsolidationDryRunLine = {
  lineId: string;
  label: string;
  sourceField: string | null;
  distributionStrategy:
    | "PDT_RESULT_WITH_DIFFERENCE_APPORTIONMENT"
    | "VRMASTER_COST_CENTER_BASE_WITH_FALLBACK_APPORTIONMENT"
    | "VRMASTER_COST_CENTER_EXACT"
    | null;
  vrDreTerms: Array<{
    vrDreId: number;
    multiplier: 1 | -1;
    lineDescription: string | null;
    rawDebitValue: number;
    rawCreditValue: number;
    rawValue: number;
    debitValue: number;
    creditValue: number;
    value: number;
  }>;
  pdtConnectTotal: number;
  vrMasterTotal: number;
  vrMasterDebitTotal: number;
  vrMasterCreditTotal: number;
  vrMasterNetTotal: number;
  vrMasterAllocatedTotal: number;
  unallocatedValue: number;
  apportionedValue: number;
  difference: number;
  costCenters: DailyResultConsolidationDryRunCostCenter[];
  finalTotal: number;
  roundingResidualApplied: number;
  warnings: string[];
  blockedReason?: string;
};

export type DailyResultConsolidationDryRunResponse = {
  month: string;
  storeId: number;
  period: {
    initialDate: string;
    finalDate: string;
  };
  fiscalIntegration: DailyResultConsolidationFiscalIntegration;
  lines: DailyResultConsolidationDryRunLine[];
  writesEnabled: false;
};

export type DailyResultConsolidationDryRunPayload = {
  month: string;
  storeId: string | number;
  lineIds?: string[];
};

export type DailyResultConsolidationConfirmPayload = {
  month: string;
  storeId: string | number;
};

export type DailyResultConsolidationConfirmResponse = {
  month: string;
  storeId: number;
  status: "CONSOLIDATED";
  source: "EXPLICIT_STATUS";
  writesEnabled: true;
  monthlyResult: {
    created: number;
    updated: number;
    costCenterCount: number;
  };
  consolidation: {
    status: "CONSOLIDATED";
    consolidatedAt: string | null;
    consolidatedByUserId: number | null;
    notes: string | null;
  };
  persistedFields: Array<keyof DRE>;
  totals: Partial<Record<keyof DRE, number>>;
  warnings: string[];
};

export type ReverseMonthlyResultConsolidationPayload = {
  month: string;
  storeId: string | number;
  notes?: string;
};

export type ResultLineDetailItem = {
  date: string;
  storeId: number;
  sourceStoreId?: number | null;
  allocationStoreId?: number | null;
  costCenterId: number | null;
  allocationCostCenterId?: number | null;
  allocationPercent?: number | null;
  accountId?: number | null;
  accountDescription?: string | null;
  dreLineDescription?: string | null;
  source: "CONSOLIDATED" | "NOT_CONSOLIDATED";
  origin: string;
  description: string;
  debitValue: number;
  creditValue: number;
  value: number;
};

export type ResultLineDetailsResponse = {
  lineId: string;
  label?: string;
  detailLevel: 1;
  writesEnabled: false;
  items: ResultLineDetailItem[];
  totals: {
    debitValue: number;
    creditValue: number;
    value: number;
  };
};

export type ResultLineDetailsFilters = {
  initialDate: string;
  finalDate: string;
  storeIds: Array<string | number>;
  costCenterIds?: Array<string | number>;
};

export type RecBrutaDetailItem = ResultLineDetailItem;
export type RecBrutaDetailsResponse = ResultLineDetailsResponse;
export type RecBrutaDetailsFilters = ResultLineDetailsFilters;

export class DailyResultConsolidationDryRunError extends Error {
  status: number;
  fiscalIntegration?: DailyResultConsolidationFiscalIntegration;

  constructor(input: {
    message: string;
    status: number;
    fiscalIntegration?: DailyResultConsolidationFiscalIntegration;
  }) {
    super(input.message);
    this.name = "DailyResultConsolidationDryRunError";
    this.status = input.status;
    this.fiscalIntegration = input.fiscalIntegration;
  }
}

export function useDRE (token?: string | null) {
    const fetchDREData = useCallback(async (filters: GetDREParams) => {
        const qs = new URLSearchParams();
        if (filters?.storeId) qs.set("storeId", filters.storeId.join(','));
        if (filters?.costCenterId) qs.set("costCenterId", filters?.costCenterId.join(','));
        if (filters?.initialDate) qs.set("initialDate", filters.initialDate);
        if (filters?.finalDate) qs.set("finalDate", filters.finalDate);

        const url = `${BASE}/unified${qs.toString() ? `?${qs.toString()}` : ""}`;

        return api<DREByCostCenter[]>(url, { headers: authHeaders(token) });
      }, [token]);

      const fetchCostCenters = useCallback(async () => {
        return api<CostCenter[]>(`${API_BASE}/api/cost-centers`, { headers: authHeaders(token) })
      }, [token])

      const fetchStores = useCallback(async () => {
        return api<Store[]>(`${API_BASE}/api/stores`, { headers: authHeaders(token) })
      }, [token])

      const fetchDailyResultLineConfig = useCallback(async () => {
        return api<DailyResultLineConfigDto[]>(`${BASE}/daily-result-config`, { headers: authHeaders(token) })
      }, [token])

      const fetchMonthlyResultConsolidations = useCallback(
        async (filters: MonthlyResultConsolidationFilters) => {
          const qs = new URLSearchParams();
          qs.set("initialMonth", filters.initialMonth);
          qs.set("finalMonth", filters.finalMonth);
          qs.set("storeIds", filters.storeIds.join(","));

          return api<MonthlyResultConsolidationStatusRow[]>(
            `${BASE}/monthly-result-consolidations?${qs.toString()}`,
            { headers: authHeaders(token) },
          );
        },
        [token],
      )

      const fetchDailyResultEditValues = useCallback(
        async (filters: DailyResultEditValuesFilters) => {
          const qs = new URLSearchParams();
          qs.set("month", filters.month);
          qs.set("storeId", String(filters.storeId));

          return api<DailyResultEditValuesResponse>(
            `${BASE}/daily-result-edit-values?${qs.toString()}`,
            { headers: authHeaders(token) },
          );
        },
        [token],
      )

      const saveDailyResultEditValues = useCallback(
        async (payload: DailyResultEditValuesSavePayload) => {
          return api<DailyResultEditValuesSaveResponse>(
            `${BASE}/daily-result-edit-values`,
            {
              method: "PUT",
              headers: authHeaders(token),
              body: JSON.stringify(payload),
            },
          );
        },
        [token],
      )

      const runDailyResultConsolidationDryRun = useCallback(
        async (payload: DailyResultConsolidationDryRunPayload) => {
          const response = await fetch(`${BASE}/consolidation/dry-run`, {
            method: "POST",
            headers: authHeaders(token),
            body: JSON.stringify({
              month: payload.month,
              storeId: Number(payload.storeId),
              ...(payload.lineIds?.length ? { lineIds: payload.lineIds } : {}),
            }),
          });
          const raw = await response.text();
          const parsed = parseJsonResponse(raw);

          if (!response.ok) {
            throw new DailyResultConsolidationDryRunError({
              message: extractDryRunErrorMessage(parsed, response.status),
              status: response.status,
              fiscalIntegration: readFiscalIntegration(parsed),
            });
          }

          return parsed as DailyResultConsolidationDryRunResponse;
        },
        [token],
      )

      const confirmDailyResultConsolidation = useCallback(
        async (payload: DailyResultConsolidationConfirmPayload) => {
          return api<DailyResultConsolidationConfirmResponse>(
            `${BASE}/consolidation/confirm`,
            {
              method: "POST",
              headers: authHeaders(token),
              body: JSON.stringify({
                month: payload.month,
                storeId: Number(payload.storeId),
              }),
            },
          );
        },
        [token],
      )

      const reverseMonthlyResultConsolidation = useCallback(
        async (payload: ReverseMonthlyResultConsolidationPayload) => {
          return api<ReverseMonthlyResultConsolidationResponse>(
            `${BASE}/monthly-result-consolidations/reverse`,
            {
              method: "POST",
              headers: authHeaders(token),
              body: JSON.stringify({
                month: payload.month,
                storeId: Number(payload.storeId),
                notes: payload.notes,
              }),
            },
          );
        },
        [token],
      )

      const fetchResultLineDetails = useCallback(
        async (lineId: string, filters: ResultLineDetailsFilters) => {
          const qs = new URLSearchParams();
          qs.set("initialDate", filters.initialDate);
          qs.set("finalDate", filters.finalDate);
          qs.set("storeIds", filters.storeIds.map(String).join(","));
          if (filters.costCenterIds?.length) {
            qs.set("costCenterIds", filters.costCenterIds.map(String).join(","));
          }

          return api<ResultLineDetailsResponse>(
            `${BASE}/result-lines/${encodeURIComponent(lineId)}/details?${qs.toString()}`,
            { headers: authHeaders(token) },
          );
        },
        [token],
      )

      const fetchRecBrutaDetails = useCallback(
        async (filters: RecBrutaDetailsFilters) =>
          fetchResultLineDetails("recBruta", filters),
        [fetchResultLineDetails],
      )

    return {
      fetchDREData,
      fetchCostCenters,
      fetchStores,
      fetchDailyResultLineConfig,
      fetchMonthlyResultConsolidations,
      fetchDailyResultEditValues,
      saveDailyResultEditValues,
      runDailyResultConsolidationDryRun,
      confirmDailyResultConsolidation,
      reverseMonthlyResultConsolidation,
      fetchResultLineDetails,
      fetchRecBrutaDetails,
    } as const;
}

function parseJsonResponse(raw: string): unknown {
  if (!raw) return undefined;

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function extractDryRunErrorMessage(payload: unknown, status: number) {
  if (typeof payload === "string" && payload.trim()) return payload;

  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;
    if (Array.isArray(message)) return message.join("; \n");
    if (typeof message === "string" && message.trim()) return message;
  }

  return `Falha na simulacao da consolidacao (${status}).`;
}

function readFiscalIntegration(
  payload: unknown,
): DailyResultConsolidationFiscalIntegration | undefined {
  if (!payload || typeof payload !== "object" || !("fiscalIntegration" in payload)) {
    return undefined;
  }

  const fiscalIntegration = (payload as {
    fiscalIntegration?: Partial<DailyResultConsolidationFiscalIntegration>;
  }).fiscalIntegration;

  if (!fiscalIntegration) return undefined;

  return {
    status: fiscalIntegration.status === "OK" ? "OK" : "ERROR",
    missingDates: Array.isArray(fiscalIntegration.missingDates)
      ? fiscalIntegration.missingDates.map(String)
      : [],
    notFinalizedDates: Array.isArray(fiscalIntegration.notFinalizedDates)
      ? fiscalIntegration.notFinalizedDates.map(String)
      : [],
  };
}
