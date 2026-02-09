// src/pages/configuracoes/db-scripts/hooks/useDbScriptsCrud.ts
import { useCallback } from "react";
import { dbScriptsApi } from "../api";
import type { CreateDbScriptDto, UpdateDbScriptDto } from "../types";
import type { Id } from "../../../../../components/crud/GridForm";

export function useDbScriptsCrud(token?: string | null) {
  const fetchAll = useCallback(async () => {
    return dbScriptsApi.list(token);
  }, [token]);

  const createItem = useCallback(async (data: CreateDbScriptDto) => {
    await dbScriptsApi.create(data, token);
  }, [token]);

  const updateItem = useCallback(async (id: Id, data: UpdateDbScriptDto) => {
    await dbScriptsApi.update(Number(id), data, token);
  }, [token]);

  const deleteItem = useCallback(async (id: Id) => {
    await dbScriptsApi.remove(Number(id), token);
  }, [token]);

  const runNow = useCallback(async (id: Id) => {
    await dbScriptsApi.runNow(Number(id), token);
  }, [token]);

  return { fetchAll, createItem, updateItem, deleteItem, runNow };
}
