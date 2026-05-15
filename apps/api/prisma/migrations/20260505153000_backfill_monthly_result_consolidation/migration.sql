-- Backfill explicit consolidation control from historical MonthlyResult rows.
-- Idempotent: storeId + month is unique, and manually reversed rows are preserved.
WITH monthly_result_months AS (
    SELECT DISTINCT
        "storeId",
        date_trunc('month', "date")::timestamp(3) AS "month"
    FROM "MonthlyResult"
)
INSERT INTO "MonthlyResultConsolidation" (
    "storeId",
    "month",
    "status",
    "consolidatedAt",
    "createdAt",
    "updatedAt"
)
SELECT
    "storeId",
    "month",
    'CONSOLIDATED'::"MonthlyResultConsolidationStatus",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM monthly_result_months
ON CONFLICT ("storeId", "month") DO UPDATE
SET
    "status" = 'CONSOLIDATED'::"MonthlyResultConsolidationStatus",
    "consolidatedAt" = COALESCE(
        "MonthlyResultConsolidation"."consolidatedAt",
        EXCLUDED."consolidatedAt"
    ),
    "updatedAt" = CURRENT_TIMESTAMP
WHERE
    "MonthlyResultConsolidation"."status" <> 'REVERSED'
    AND (
        "MonthlyResultConsolidation"."status" <> 'CONSOLIDATED'
        OR "MonthlyResultConsolidation"."consolidatedAt" IS NULL
    );
