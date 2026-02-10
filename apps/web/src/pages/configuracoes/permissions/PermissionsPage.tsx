import React, { useMemo, useState } from "react";
import SearchIcon from "@mui/icons-material/Search";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";

import Layout from "../../../components/Layout";
import { useAuth } from "../../../hooks/useAuth";
import { getGroupPath, topGroupFromPath } from "./utils";
import { rowStyle } from "./styles";
import Section from "./components/Section";
import Toolbar from "./components/Toolbar";
import UsersSidebar from "./components/UsersSidebar";
import PermissionRow from "./components/PermissionRow";
import Badge from "./components/Badge";
import type { PermissionCatalogEntry } from "./types";
import { usePermissionsData } from "./hooks/usePermissionsData";

type GroupNode = {
  path: string;
  items: PermissionCatalogEntry[];
};

type RootNode = {
  root: string;
  groups: GroupNode[];
  count: number;
};

const EMPTY = { global: false, stores: [] as number[] };

export default function PermissionsPage() {
  const { token } = useAuth();
  const {
    users,
    stores,
    catalog,
    selectedUserId,
    setSelectedUserId,
    original,
    working,
    setWorking,
    loading,
    saving,
    error,
    changedCodes,
    resetChanges,
    reloadUserPerms,
    save,
    copyFromUser,
  } = usePermissionsData(token);

  const [userQuery, setUserQuery] = useState("");
  const [permQuery, setPermQuery] = useState("");
  const [rootsOpen, setRootsOpen] = useState<Record<string, boolean>>({});
  const [groupsOpen, setGroupsOpen] = useState<Record<string, boolean>>({});
  const [copyFromId, setCopyFromId] = useState<number | "">("");

  React.useEffect(() => {
    const roots: Record<string, boolean> = {};
    const groups: Record<string, boolean> = {};
    for (const item of catalog) {
      const groupPath = getGroupPath(item);
      const root = topGroupFromPath(groupPath);
      roots[root] = false;
      groups[groupPath] = false;
    }
    setRootsOpen(roots);
    setGroupsOpen(groups);
  }, [catalog]);

  const filteredCatalog = useMemo(() => {
    const q = permQuery.trim().toLowerCase();
    return q
      ? catalog.filter((p) =>
          `${p.code} ${p.label} ${getGroupPath(p)}`.toLowerCase().includes(q),
        )
      : catalog;
  }, [catalog, permQuery]);

  const groupedRoots = useMemo<RootNode[]>(() => {
    const byPath = new Map<string, PermissionCatalogEntry[]>();

    for (const item of filteredCatalog) {
      const path = getGroupPath(item);
      if (!byPath.has(path)) byPath.set(path, []);
      byPath.get(path)!.push(item);
    }

    const rootsMap = new Map<string, GroupNode[]>();

    for (const [path, items] of byPath.entries()) {
      const root = topGroupFromPath(path);
      if (!rootsMap.has(root)) rootsMap.set(root, []);
      rootsMap.get(root)!.push({
        path,
        items: items.sort((a, b) => a.label.localeCompare(b.label)),
      });
    }

    return Array.from(rootsMap.entries())
      .map(([root, groups]) => {
        const sortedGroups = groups.sort((a, b) => a.path.localeCompare(b.path));
        const count = sortedGroups.reduce((acc, g) => acc + g.items.length, 0);
        return { root, groups: sortedGroups, count };
      })
      .sort((a, b) => a.root.localeCompare(b.root));
  }, [filteredCatalog]);

  const hasChanges = changedCodes.length > 0;
  const canSave = selectedUserId !== null && selectedUserId !== undefined;

  function toggleRoot(name: string, open?: boolean) {
    setRootsOpen((prev) => ({ ...prev, [name]: open ?? !prev[name] }));
  }

  function toggleGroup(path: string, open?: boolean) {
    setGroupsOpen((prev) => ({ ...prev, [path]: open ?? !prev[path] }));
  }

  function setCodes(codes: string[], enable: boolean) {
    if (codes.length === 0) return;
    setWorking((prev) => {
      const next = { ...prev };
      for (const code of codes) {
        next[code] = enable ? { global: true, stores: [] } : { global: false, stores: [] };
      }
      return next;
    });
  }

  function codesByGroupPrefix(prefix: string): string[] {
    return catalog
      .filter((item) => {
        const path = getGroupPath(item);
        return path === prefix || path.startsWith(`${prefix}/`);
      })
      .map((item) => item.code);
  }

  function applyRootGroup(root: string, enable: boolean) {
    setCodes(codesByGroupPrefix(root), enable);
  }

  function applyPathGroup(path: string, enable: boolean) {
    setCodes(codesByGroupPrefix(path), enable);
  }

  function isChanged(code: string): boolean {
    const prev = original[code] || EMPTY;
    const curr = working[code] || EMPTY;
    const prevStores = [...(prev.stores || [])].sort((a, b) => a - b).join(",");
    const currStores = [...(curr.stores || [])].sort((a, b) => a - b).join(",");
    return prev.global !== curr.global || prevStores !== currStores;
  }

  return (
    <Layout title="Permissoes">
      <div className="grid items-start gap-4 xl:grid-cols-[340px_1fr]">
        <UsersSidebar
          users={users}
          selectedUserId={selectedUserId}
          onSelectUser={setSelectedUserId}
          userQuery={userQuery}
          onChangeUserQuery={setUserQuery}
          copyFromId={copyFromId}
          onChangeCopyFromId={setCopyFromId}
          onCopyFrom={() => {
            if (copyFromId !== "" && copyFromId !== selectedUserId) {
              copyFromUser(Number(copyFromId));
            }
          }}
        />

        <div className="flex flex-col gap-4">
          <Section
            title="Editor de permissoes"
            right={
              <Toolbar
                canSave={canSave}
                saving={saving}
                onSave={save}
                onReset={resetChanges}
                onReload={reloadUserPerms}
                hasChanges={hasChanges}
              />
            }
          >
            {selectedUserId === null || selectedUserId === undefined ? (
              <div className="grid place-items-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-10 text-sm text-neutral-500 dark:border-white/15 dark:bg-pilar-default-bg-dark/40 dark:text-neutral-400">
                <InfoOutlinedIcon className="mb-2" />
                Selecione um usuario a esquerda para editar.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                    <strong>Erro:</strong> {error}
                  </div>
                )}

                {hasChanges && (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-200">
                    <InfoOutlinedIcon fontSize="small" />
                    Voce tem alteracoes nao salvas em
                    <strong className="mx-1">{changedCodes.length}</strong>
                    permissao(oes).
                  </div>
                )}

                {selectedUserId === 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-200">
                    Usuario administrador (id = 0). No sistema, ele nao sofre validacao de permissoes.
                  </div>
                )}

                <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-300">
                  <SearchIcon fontSize="small" />
                  <input
                    value={permQuery}
                    onChange={(e) => setPermQuery(e.target.value)}
                    placeholder="Buscar permissao (codigo/label/grupo)..."
                    className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-700 outline-none placeholder:text-neutral-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-white/15 dark:bg-pilar-default-bg-dark dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-emerald-400 dark:focus:ring-emerald-500/20"
                  />
                </div>

                <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-white/10">
                  {loading ? (
                    <div className="p-5 text-sm text-neutral-500 dark:text-neutral-400">
                      Carregando permissoes...
                    </div>
                  ) : (
                    groupedRoots.map((rootNode) => (
                      <div key={rootNode.root}>
                        <div className="flex items-center justify-between gap-2 border-b border-neutral-200 bg-neutral-50 px-3.5 py-3 dark:border-white/10 dark:bg-pilar-default-bg2-dark">
                          <div className="flex items-center gap-2">
                            <strong className="text-sm text-neutral-800 capitalize dark:text-neutral-100">
                              {rootNode.root}
                            </strong>
                            <Badge tone="neutral">{rootNode.count}</Badge>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => applyRootGroup(rootNode.root, true)}
                              className="rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200 dark:hover:bg-emerald-500/30"
                            >
                              Liberar grupo
                            </button>
                            <button
                              type="button"
                              onClick={() => applyRootGroup(rootNode.root, false)}
                              className="rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200 dark:hover:bg-amber-500/30"
                            >
                              Remover grupo
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleRoot(rootNode.root)}
                              className="rounded-md p-1 text-neutral-600 transition-colors hover:bg-neutral-200 hover:text-neutral-800 dark:text-neutral-300 dark:hover:bg-white/10 dark:hover:text-neutral-100"
                            >
                              {rootsOpen[rootNode.root] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            </button>
                          </div>
                        </div>

                        {rootsOpen[rootNode.root] &&
                          rootNode.groups.map((groupNode) => (
                            <div key={groupNode.path}>
                              <div className="flex items-center justify-between gap-2 border-b border-neutral-200 bg-white px-3.5 py-2.5 dark:border-white/10 dark:bg-pilar-default-bg-dark">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-neutral-600 dark:text-neutral-300">{groupNode.path}</span>
                                  <Badge tone="neutral">{groupNode.items.length}</Badge>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => applyPathGroup(groupNode.path, true)}
                                    className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-white/20 dark:bg-transparent dark:text-neutral-200 dark:hover:bg-white/10"
                                  >
                                    Liberar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => applyPathGroup(groupNode.path, false)}
                                    className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-white/20 dark:bg-transparent dark:text-neutral-200 dark:hover:bg-white/10"
                                  >
                                    Remover
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => toggleGroup(groupNode.path)}
                                    className="rounded-md p-1 text-neutral-600 transition-colors hover:bg-neutral-200 hover:text-neutral-800 dark:text-neutral-300 dark:hover:bg-white/10 dark:hover:text-neutral-100"
                                  >
                                    {groupsOpen[groupNode.path] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                  </button>
                                </div>
                              </div>

                              {groupsOpen[groupNode.path] && (
                                <div>
                                  <div
                                    style={rowStyle}
                                    className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-500 dark:border-white/10 dark:bg-pilar-default-bg-dark dark:text-neutral-400"
                                  >
                                    <div>Permissao</div>
                                    <div className="text-left">Global/Conceder</div>
                                    <div>Lojas (quando nao global)</div>
                                  </div>

                                  {groupNode.items.map((p) => (
                                    <PermissionRow
                                      key={p.code}
                                      catalogItem={p}
                                      groupPath={groupNode.path}
                                      value={working[p.code] || EMPTY}
                                      original={original[p.code]}
                                      stores={stores}
                                      onToggleGlobal={(checked) =>
                                        setWorking((prev) => ({
                                          ...prev,
                                          [p.code]: { ...(prev[p.code] || EMPTY), global: checked },
                                        }))
                                      }
                                      onToggleStore={(storeId) =>
                                        setWorking((prev) => {
                                          const base = prev[p.code] || EMPTY;
                                          const has = base.stores.includes(storeId);
                                          const nextStores = has
                                            ? base.stores.filter((i) => i !== storeId)
                                            : [...base.stores, storeId];
                                          return { ...prev, [p.code]: { ...base, stores: nextStores } };
                                        })
                                      }
                                      onSetAllStores={(on) =>
                                        setWorking((prev) => ({
                                          ...prev,
                                          [p.code]: {
                                            ...(prev[p.code] || EMPTY),
                                            stores: on ? stores.map((s) => s.id) : [],
                                          },
                                        }))
                                      }
                                      changed={isChanged(p.code)}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    ))
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                    <CheckIcon fontSize="small" />
                    {Object.values(working).filter((x) => x.global).length} globais ativas
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                    <CloseIcon fontSize="small" />
                    {Object.values(working).filter((x) => !x.global && x.stores.length > 0).length} por loja com alguma selecao
                  </span>
                </div>
              </div>
            )}
          </Section>
        </div>
      </div>
    </Layout>
  );
}
