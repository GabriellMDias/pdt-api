INSERT INTO "Permission" ("code", "label", "useStorePermission")
VALUES
    ('mobile-releases:consultar', 'Consultar versoes Mobile', false),
    ('mobile-releases:publicar', 'Publicar versoes Mobile', false),
    ('mobile-releases:baixar', 'Baixar versoes Mobile', false)
ON CONFLICT ("code") DO UPDATE SET
    "label" = EXCLUDED."label",
    "useStorePermission" = EXCLUDED."useStorePermission";
