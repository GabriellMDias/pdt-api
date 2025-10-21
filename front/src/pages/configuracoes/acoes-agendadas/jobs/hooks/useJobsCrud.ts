import { useCallback } from "react";
import { jobsApi } from "../api";
import type { UpdateJobDto } from "../types";
import type { Id } from "../../../../../components/crud/GridForm";

export function useJobsCrud(token?: string | null) {
  const fetchAll = useCallback(async () => {
    return jobsApi.list(token);
  }, [token]);

  const updateItem = useCallback(async (id: Id, data: UpdateJobDto) => {
    await jobsApi.update(Number(id), data, token);
  }, [token]);

  const runNow = useCallback(async (id: Id) => {
    await jobsApi.runNow(Number(id), token);
  }, [token]);

  return { fetchAll, updateItem, runNow };
}
