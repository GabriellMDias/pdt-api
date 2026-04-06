import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  fieldControlBaseClass,
  fieldControlInteractiveClass,
  fieldMenuSurfaceClass,
} from "../../../../components/inputs/styles";
import { useAuth } from "../../../../hooks/useAuth";
import { api, authHeaders } from "../../../../services/api";
import type {
  CurvaAbcMercadologicoPair,
  DepartmentApiItem,
  MercadologicoFiltroValor,
  MercadologicoNivel1,
} from "../types";

type Props = {
  value: MercadologicoFiltroValor;
  onChange: (value: MercadologicoFiltroValor) => void;
  placeholder?: string;
  className?: string;
  syncUrl?: boolean;
  urlParamKey?: string;
  clearUrlKeys?: string[];
  replaceHistory?: boolean;
};

function makePairKey(
  mercadologico1: number | string,
  mercadologico2: number | string,
) {
  return `${mercadologico1}:${mercadologico2}`;
}

function compareByCodeAndDescription<
  T extends { code: number; description: string },
>(a: T, b: T) {
  if (a.code !== b.code) return a.code - b.code;
  return a.description.localeCompare(b.description, "pt-BR", {
    sensitivity: "base",
  });
}

function comparePairs(
  a: CurvaAbcMercadologicoPair,
  b: CurvaAbcMercadologicoPair,
) {
  if (a.mercadologico1 !== b.mercadologico1) {
    return a.mercadologico1 - b.mercadologico1;
  }

  return a.mercadologico2 - b.mercadologico2;
}

function normalizePairs(pairs: CurvaAbcMercadologicoPair[]) {
  const uniquePairs = new Map<string, CurvaAbcMercadologicoPair>();

  for (const pair of pairs) {
    const mercadologico1 = Number(pair.mercadologico1);
    const mercadologico2 = Number(pair.mercadologico2);

    if (
      !Number.isInteger(mercadologico1) ||
      !Number.isInteger(mercadologico2)
    ) {
      continue;
    }

    uniquePairs.set(makePairKey(mercadologico1, mercadologico2), {
      mercadologico1,
      mercadologico2,
    });
  }

  return Array.from(uniquePairs.values()).sort(comparePairs);
}

function parsePairToken(token: string): CurvaAbcMercadologicoPair | null {
  const match = /^(\d+):(\d+)$/.exec(token.trim());
  if (!match) return null;

  return {
    mercadologico1: Number(match[1]),
    mercadologico2: Number(match[2]),
  };
}

function parsePairsFromSearchParams(values: string[]) {
  return normalizePairs(
    values
      .flatMap((value) => String(value).split(","))
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => parsePairToken(value))
      .filter((value): value is CurvaAbcMercadologicoPair => value !== null),
  );
}

function haveSamePairs(
  current: CurvaAbcMercadologicoPair[],
  next: CurvaAbcMercadologicoPair[],
) {
  if (current.length !== next.length) return false;

  return current.every((pair, index) => {
    const nextPair = next[index];
    return (
      pair.mercadologico1 === nextPair.mercadologico1 &&
      pair.mercadologico2 === nextPair.mercadologico2
    );
  });
}

function renderSelectionMark(kind: "checked" | "indeterminate" | "empty") {
  if (kind === "checked") {
    return (
      <svg width="12" height="12" viewBox="0 0 20 20">
        <path
          d="M5 10l3 3 7-7"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (kind === "indeterminate") {
    return (
      <svg width="12" height="12" viewBox="0 0 20 20">
        <path
          d="M5 10h10"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return null;
}

export default function MercadologicoHierarchyMultiSelect({
  value,
  onChange,
  placeholder = "Selecione os mercadologicos...",
  className,
  syncUrl = true,
  urlParamKey = "mercadologicoPair",
  clearUrlKeys = ["mercadologico1", "mercadologico2"],
  replaceHistory = true,
}: Props) {
  const { token } = useAuth();
  const [sp, setSearchParams] = useSearchParams();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<DepartmentApiItem[]>([]);
  const [expandedParents, setExpandedParents] = useState<string[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const didInitFromUrl = useRef(false);
  const lastUrlValueRef = useRef("");

  const selectedPairs = useMemo(
    () => normalizePairs(value.pares),
    [value.pares],
  );
  const selectedPairKeys = useMemo(
    () =>
      new Set(
        selectedPairs.map((pair) =>
          makePairKey(pair.mercadologico1, pair.mercadologico2),
        ),
      ),
    [selectedPairs],
  );
  const expandedParentsSet = useMemo(
    () => new Set(expandedParents),
    [expandedParents],
  );

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (!syncUrl) return;
    if (didInitFromUrl.current) return;

    const rawPairValues = sp.getAll(urlParamKey);
    const pairsFromUrl = parsePairsFromSearchParams(rawPairValues);

    if (pairsFromUrl.length > 0 && selectedPairs.length === 0) {
      onChange({ pares: pairsFromUrl });
    }

    if (rawPairValues.length > 0 || clearUrlKeys.some((key) => sp.has(key))) {
      const qs = new URLSearchParams(sp);
      if (pairsFromUrl.length > 0) {
        qs.set(
          urlParamKey,
          pairsFromUrl
            .map((pair) =>
              makePairKey(pair.mercadologico1, pair.mercadologico2),
            )
            .join(","),
        );
      } else {
        qs.delete(urlParamKey);
      }

      for (const key of clearUrlKeys) qs.delete(key);

      setSearchParams(qs, { replace: true });
      lastUrlValueRef.current = pairsFromUrl
        .map((pair) => makePairKey(pair.mercadologico1, pair.mercadologico2))
        .join(",");
    }

    didInitFromUrl.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncUrl, sp, urlParamKey, clearUrlKeys, onChange, selectedPairs.length]);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setFetchError(null);

    api<DepartmentApiItem[]>("/api/departments", {
      headers: authHeaders(token),
      signal: ac.signal,
    })
      .then((data) => setDepartments(Array.isArray(data) ? data : []))
      .catch((error: unknown) => {
        const err = error as { name?: string; message?: string };
        if (err.name !== "AbortError") {
          setFetchError(err.message || "Falha ao carregar mercadologicos.");
        }
      })
      .finally(() => setLoading(false));

    return () => ac.abort();
  }, [token]);

  const mercadologicoTree = useMemo<MercadologicoNivel1[]>(() => {
    const parents = departments
      .filter((item) => item.level === 1)
      .map((item) => ({
        id: `m1-${item.departmentVrId1}`,
        code: item.departmentVrId1,
        description: item.description,
        children: [] as MercadologicoNivel1["children"],
      }));

    const childrenByParent = new Map<number, MercadologicoNivel1["children"]>();
    for (const item of departments.filter(
      (department) => department.level === 2,
    )) {
      const current = childrenByParent.get(item.departmentVrId1) ?? [];
      current.push({
        id: `m2-${item.departmentVrId1}-${item.departmentVrId2}`,
        code: item.departmentVrId2,
        description: item.description,
      });
      childrenByParent.set(item.departmentVrId1, current);
    }

    return parents
      .map((parent) => ({
        ...parent,
        children: (childrenByParent.get(parent.code) ?? []).sort(
          compareByCodeAndDescription,
        ),
      }))
      .sort(compareByCodeAndDescription);
  }, [departments]);

  useEffect(() => {
    if (mercadologicoTree.length === 0) return;

    const validPairKeys = new Set(
      mercadologicoTree.flatMap((parent) =>
        parent.children.map((child) => makePairKey(parent.code, child.code)),
      ),
    );

    const validPairs = selectedPairs.filter((pair) =>
      validPairKeys.has(makePairKey(pair.mercadologico1, pair.mercadologico2)),
    );

    if (!haveSamePairs(selectedPairs, validPairs)) {
      onChange({ pares: validPairs });
    }
  }, [mercadologicoTree, onChange, selectedPairs]);

  useEffect(() => {
    if (!syncUrl) return;
    if (!didInitFromUrl.current) return;

    const current = selectedPairs
      .map((pair) => makePairKey(pair.mercadologico1, pair.mercadologico2))
      .join(",");
    const currentInUrl = sp.get(urlParamKey) || "";

    if (current === currentInUrl) {
      lastUrlValueRef.current = current;
      return;
    }

    if (lastUrlValueRef.current === current) return;

    const qs = new URLSearchParams(sp);
    if (current) qs.set(urlParamKey, current);
    else qs.delete(urlParamKey);

    for (const key of clearUrlKeys) qs.delete(key);

    setSearchParams(qs, { replace: replaceHistory });
    lastUrlValueRef.current = current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPairs, sp, syncUrl, urlParamKey, clearUrlKeys, replaceHistory]);

  const labelsByPairKey = useMemo(() => {
    const labels = new Map<string, string>();

    for (const parent of mercadologicoTree) {
      for (const child of parent.children) {
        labels.set(
          makePairKey(parent.code, child.code),
          `${parent.description} > ${child.description} (${parent.code}:${child.code})`,
        );
      }
    }

    return labels;
  }, [mercadologicoTree]);

  const parentByCode = useMemo(
    () => new Map(mercadologicoTree.map((parent) => [parent.code, parent])),
    [mercadologicoTree],
  );

  const selectedLabels = useMemo(
    () =>
      selectedPairs.map(
        (pair) =>
          labelsByPairKey.get(
            makePairKey(pair.mercadologico1, pair.mercadologico2),
          ) ?? `${pair.mercadologico1}:${pair.mercadologico2}`,
      ),
    [labelsByPairKey, selectedPairs],
  );

  const filteredTree = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return mercadologicoTree;

    return mercadologicoTree
      .map((parent) => {
        const parentMatches = `${parent.code} ${parent.description}`
          .toLowerCase()
          .includes(normalizedQuery);

        const matchingChildren = parent.children.filter((child) =>
          `${parent.code} ${child.code} ${child.description}`
            .toLowerCase()
            .includes(normalizedQuery),
        );

        if (parentMatches) {
          return parent;
        }

        if (matchingChildren.length > 0) {
          return {
            ...parent,
            children: matchingChildren,
          };
        }

        return null;
      })
      .filter((item): item is MercadologicoNivel1 => item !== null);
  }, [mercadologicoTree, query]);

  const allAvailablePairs = useMemo(
    () =>
      normalizePairs(
        mercadologicoTree.flatMap((parent) =>
          parent.children.map((child) => ({
            mercadologico1: parent.code,
            mercadologico2: child.code,
          })),
        ),
      ),
    [mercadologicoTree],
  );

  const totalSelectedPairs = selectedPairs.length;
  const disabled =
    loading || Boolean(fetchError) || mercadologicoTree.length === 0;

  const buttonLabel = useMemo(() => {
    if (loading) return "Carregando mercadologicos...";
    if (fetchError) return "Erro ao carregar mercadologicos";
    if (mercadologicoTree.length === 0) return "Sem mercadologicos disponiveis";
    if (totalSelectedPairs === 0) return placeholder;
    if (totalSelectedPairs === 1) return selectedLabels[0] ?? placeholder;
    return `${totalSelectedPairs} pares selecionados`;
  }, [
    fetchError,
    loading,
    mercadologicoTree.length,
    placeholder,
    selectedLabels,
    totalSelectedPairs,
  ]);

  function updateSelectedPairs(nextPairs: CurvaAbcMercadologicoPair[]) {
    onChange({ pares: normalizePairs(nextPairs) });
  }

  function getParentChildrenPairs(parent: MercadologicoNivel1) {
    return parent.children.map((child) => ({
      mercadologico1: parent.code,
      mercadologico2: child.code,
    }));
  }

  function getParentSelectionState(parent: MercadologicoNivel1) {
    const childrenPairs = getParentChildrenPairs(parent);
    if (childrenPairs.length === 0) {
      return { checked: false, indeterminate: false };
    }

    const selectedChildrenCount = childrenPairs.filter((pair) =>
      selectedPairKeys.has(
        makePairKey(pair.mercadologico1, pair.mercadologico2),
      ),
    ).length;

    return {
      checked: selectedChildrenCount === childrenPairs.length,
      indeterminate:
        selectedChildrenCount > 0 &&
        selectedChildrenCount < childrenPairs.length,
    };
  }

  function getAllSelectionState() {
    if (allAvailablePairs.length === 0) {
      return { checked: false, indeterminate: false };
    }

    return {
      checked: totalSelectedPairs === allAvailablePairs.length,
      indeterminate:
        totalSelectedPairs > 0 && totalSelectedPairs < allAvailablePairs.length,
    };
  }

  function toggleParent(parent: MercadologicoNivel1) {
    const childrenPairs = getParentChildrenPairs(parent);
    if (childrenPairs.length === 0) return;

    const { checked } = getParentSelectionState(parent);
    if (checked) {
      const childKeys = new Set(
        childrenPairs.map((pair) =>
          makePairKey(pair.mercadologico1, pair.mercadologico2),
        ),
      );
      updateSelectedPairs(
        selectedPairs.filter(
          (pair) =>
            !childKeys.has(
              makePairKey(pair.mercadologico1, pair.mercadologico2),
            ),
        ),
      );
      return;
    }

    updateSelectedPairs([...selectedPairs, ...childrenPairs]);
  }

  function toggleChild(parentCode: number, childCode: number) {
    const pairKey = makePairKey(parentCode, childCode);
    if (selectedPairKeys.has(pairKey)) {
      updateSelectedPairs(
        selectedPairs.filter(
          (pair) =>
            makePairKey(pair.mercadologico1, pair.mercadologico2) !== pairKey,
        ),
      );
      return;
    }

    updateSelectedPairs([
      ...selectedPairs,
      { mercadologico1: parentCode, mercadologico2: childCode },
    ]);
  }

  function toggleAllPairs() {
    const { checked } = getAllSelectionState();
    if (checked) {
      updateSelectedPairs([]);
      return;
    }

    updateSelectedPairs(allAvailablePairs);
  }

  function toggleExpand(parentCode: number) {
    const key = String(parentCode);
    setExpandedParents((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  }

  function clearAll() {
    updateSelectedPairs([]);
  }

  const allSelection = getAllSelectionState();
  const allMarkKind = allSelection.checked
    ? "checked"
    : allSelection.indeterminate
      ? "indeterminate"
      : "empty";

  return (
    <div
      ref={containerRef}
      className={["relative", className ?? ""].join(" ").trim()}
    >
      <button
        type="button"
        className={[
          fieldControlInteractiveClass,
          "inline-flex items-center justify-between",
          disabled ? "cursor-not-allowed opacity-60" : "",
        ].join(" ")}
        onClick={() => !disabled && setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        title={
          selectedLabels.length > 0 ? selectedLabels.join(", ") : undefined
        }
      >
        <span
          className={[
            "truncate",
            totalSelectedPairs === 0
              ? "text-neutral-500 dark:text-neutral-400"
              : "",
          ].join(" ")}
        >
          {buttonLabel}
        </span>
        <svg
          width="18"
          height="18"
          viewBox="0 0 20 20"
          className="ml-2 opacity-80"
        >
          <path
            d="M6 8l4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className={`${fieldMenuSurfaceClass} absolute z-20 mt-2 w-full`}>
          <div className="flex items-center justify-between gap-2 border-b border-neutral-200 px-3 py-2 dark:border-neutral-700">
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              Selecione os pares de mercadologicos
            </span>
            <button
              type="button"
              className="rounded-md px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700/50"
              onClick={clearAll}
            >
              Limpar
            </button>
          </div>

          <div className="p-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar mercadologico..."
              className={fieldControlBaseClass}
            />
          </div>

          <div className="max-h-80 overflow-auto pb-2">
            {filteredTree.length === 0 && (
              <div className="px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400">
                Nenhum mercadologico encontrado.
              </div>
            )}

            {mercadologicoTree.length > 0 && (
              <div className="px-2 pb-2">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm text-neutral-800 hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-700/50"
                  onClick={toggleAllPairs}
                >
                  <span
                    className={[
                      "flex h-4 w-4 items-center justify-center rounded border",
                      allSelection.checked || allSelection.indeterminate
                        ? "border-pilar-green bg-pilar-green text-white"
                        : "border-neutral-400 bg-transparent",
                    ].join(" ")}
                  >
                    {renderSelectionMark(allMarkKind)}
                  </span>
                  <span className="truncate font-medium">Selecionar Tudo</span>
                </button>
              </div>
            )}

            {filteredTree.map((parent) => {
              const parentCode = String(parent.code);
              const isExpanded = query.trim()
                ? true
                : expandedParentsSet.has(parentCode);
              const fullParent = parentByCode.get(parent.code) ?? parent;
              const parentSelection = getParentSelectionState(fullParent);
              const parentMarkKind = parentSelection.checked
                ? "checked"
                : parentSelection.indeterminate
                  ? "indeterminate"
                  : "empty";

              return (
                <div key={parent.id}>
                  <div className="flex items-center gap-1 px-2">
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700/50"
                      onClick={() => toggleExpand(parent.code)}
                      aria-label={isExpanded ? "Recolher" : "Expandir"}
                    >
                      {parent.children.length > 0 ? (
                        isExpanded ? (
                          <svg width="16" height="16" viewBox="0 0 20 20">
                            <path
                              d="M6 8l4 4 4-4"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 20 20">
                            <path
                              d="M8 6l4 4-4 4"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )
                      ) : (
                        <span className="h-4 w-4" />
                      )}
                    </button>

                    <button
                      type="button"
                      className="flex flex-1 items-center gap-3 rounded-md px-2 py-2 text-left text-sm text-neutral-800 hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-700/50"
                      onClick={() => toggleParent(fullParent)}
                    >
                      <span
                        className={[
                          "flex h-4 w-4 items-center justify-center rounded border",
                          parentSelection.checked ||
                          parentSelection.indeterminate
                            ? "border-pilar-green bg-pilar-green text-white"
                            : "border-neutral-400 bg-transparent",
                        ].join(" ")}
                      >
                        {renderSelectionMark(parentMarkKind)}
                      </span>
                      <span className="truncate font-medium">
                        {parent.description} ({parent.code})
                      </span>
                    </button>
                  </div>

                  {isExpanded &&
                    parent.children.map((child) => {
                      const pairKey = makePairKey(parent.code, child.code);
                      const childSelected = selectedPairKeys.has(pairKey);

                      return (
                        <div key={child.id} className="pl-9 pr-2">
                          <button
                            type="button"
                            className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-700/50"
                            onClick={() => toggleChild(parent.code, child.code)}
                          >
                            <span
                              className={[
                                "flex h-4 w-4 items-center justify-center rounded border",
                                childSelected
                                  ? "border-pilar-green bg-pilar-green text-white"
                                  : "border-neutral-400 bg-transparent",
                              ].join(" ")}
                            >
                              {renderSelectionMark(
                                childSelected ? "checked" : "empty",
                              )}
                            </span>
                            <span className="truncate">
                              {child.description} ({parent.code}:{child.code})
                            </span>
                          </button>
                        </div>
                      );
                    })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {fetchError && (
        <p className="mt-1 text-xs text-red-600">Erro: {fetchError}</p>
      )}
    </div>
  );
}
