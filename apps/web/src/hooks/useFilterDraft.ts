import { useState, useCallback } from "react";

export function useFilterDraft<T extends object>(initial: T) {
  const [applied, setApplied] = useState<T>(initial);
  const [draft, setDraft] = useState<T>(initial);

  const patchDraft = useCallback((partial: Partial<T>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
  }, []);

  const apply = useCallback(() => {
    setApplied(draft);
  }, [draft]);

  const reset = useCallback(() => {
    setDraft(applied);
  }, [applied]);

  return { applied, draft, setDraft: patchDraft, setApplied, apply, reset };
}
