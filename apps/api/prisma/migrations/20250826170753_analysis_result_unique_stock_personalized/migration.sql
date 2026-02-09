-- Remova o índice único antigo (valide o nome conforme estava criado no seu banco)
DROP INDEX IF EXISTS "analysisTypeId_storeId_bucket_granularity";
DROP INDEX IF EXISTS "AnalysisResult_analysisTypeId_storeId_bucket_granularity_key";

-- Crie índice único PARCIAL que só vale para linhas SEM arquivo (estoque)
CREATE UNIQUE INDEX IF NOT EXISTS "analysis_result_unique_stock"
ON "AnalysisResult" ("analysisTypeId","storeId","bucket","granularity")
WHERE "arquivoAnaliseId" IS NULL;
