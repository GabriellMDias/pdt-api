CREATE UNIQUE INDEX user_perm_global_unique
ON "UserPermission" ("userId", "permissionId")
WHERE "storeId" IS NULL;
