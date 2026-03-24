INSERT INTO "Permission" ("code", "label", "useStorePermission")
VALUES
  ('mobile-sync-logs:consultar', 'Consultar logs de transmissao mobile', true)
ON CONFLICT ("code") DO UPDATE
SET
  "label" = EXCLUDED."label",
  "useStorePermission" = EXCLUDED."useStorePermission";
