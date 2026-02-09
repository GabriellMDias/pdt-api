import React, { useMemo, useState } from "react";
import Layout from "../../../components/Layout";
import { useAuth } from "../../../hooks/useAuth";
import SearchIcon from "@mui/icons-material/Search";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";

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

  // Filtros e UI local
  const [userQuery, setUserQuery] = useState("");
  const [permQuery, setPermQuery] = useState("");
  const [rootsOpen, setRootsOpen] = useState<Record<string, boolean>>({});
  const [groupsOpen, setGroupsOpen] = useState<Record<string, boolean>>({});
  const [copyFromId, setCopyFromId] = useState<number | "">("");

  // Inicializa grupos abertos quando catalogo mudar
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
      ? catalog.filter((p) => `${p.code} ${p.label} ${getGroupPath(p)}`.toLowerCase().includes(q))
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
      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 16, alignItems: "start" }}>
        <UsersSidebar
          users={users}
          selectedUserId={selectedUserId}
          onSelectUser={setSelectedUserId}
          userQuery={userQuery}
          onChangeUserQuery={setUserQuery}
          copyFromId={copyFromId}
          onChangeCopyFromId={setCopyFromId}
          onCopyFrom={() => {
            if (copyFromId !== "" && copyFromId !== selectedUserId) copyFromUser(Number(copyFromId));
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Section
            title="Editor de permissoes"
            right={<Toolbar canSave={canSave} saving={saving} onSave={save} onReset={resetChanges} onReload={reloadUserPerms} hasChanges={hasChanges} />}
          >
            {selectedUserId === null || selectedUserId === undefined ? (
              <div style={{ display: "grid", placeItems: "center", padding: 40, color: "#9ca3af" }}>
                <InfoOutlinedIcon style={{ marginBottom: 8 }} />
                Selecione um usuario a esquerda para editar.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {error && (
                  <div style={{ background: "var(--color-pilar-orange)", color: "#fee2e2", padding: 12, borderRadius: 8 }}>
                    <strong>Erro:</strong> {error}
                  </div>
                )}
                {hasChanges && (
                  <div style={{ background: "rgba(0,85,59,0.25)", color: "#dbeafe", padding: 12, borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
                    <InfoOutlinedIcon />
                    Voce tem alteracoes nao salvas em <strong style={{ marginLeft: 4 }}>{changedCodes.length}</strong> permissao(oes).
                  </div>
                )}
                {selectedUserId === 0 && (
                  <div style={{ background: "rgba(0,85,59,0.25)", color: "var(--color-pilar-default-bg-light)", padding: 12, borderRadius: 8 }}>
                    Usuario administrador (id = 0). No sistema, ele nao sofre validacao de permissoes.
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <SearchIcon />
                  <input
                    value={permQuery}
                    onChange={(e) => setPermQuery(e.target.value)}
                    placeholder="Buscar permissao (codigo/label/grupo)..."
                    style={{
                      flex: 1,
                      background: "var(--color-pilar-default-bg-dark)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "#e5e7eb",
                      borderRadius: 8,
                      padding: "6px 10px",
                    }}
                  />
                </div>

                <div style={{ padding: 0, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
                  {loading ? (
                    <div style={{ padding: 20, color: "#9ca3af" }}>Carregando permissoes...</div>
                  ) : (
                    groupedRoots.map((rootNode) => (
                      <div key={rootNode.root}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 8,
                            padding: "12px 14px",
                            borderBottom: "1px solid rgba(255,255,255,0.08)",
                            background: "var(--color-pilar-default-bg2-dark)",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <strong style={{ color: "#f3f4f6", textTransform: "capitalize" }}>{rootNode.root}</strong>
                            <Badge tone="neutral">{rootNode.count}</Badge>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <button
                              onClick={() => applyRootGroup(rootNode.root, true)}
                              style={{
                                background: "rgba(0,85,59,0.25)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                color: "#e5e7eb",
                                borderRadius: 8,
                                padding: "4px 8px",
                                cursor: "pointer",
                                fontSize: 12,
                              }}
                            >
                              Liberar grupo
                            </button>
                            <button
                              onClick={() => applyRootGroup(rootNode.root, false)}
                              style={{
                                background: "rgba(213,85,0,0.20)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                color: "#e5e7eb",
                                borderRadius: 8,
                                padding: "4px 8px",
                                cursor: "pointer",
                                fontSize: 12,
                              }}
                            >
                              Remover grupo
                            </button>
                            <button
                              onClick={() => toggleRoot(rootNode.root)}
                              style={{ background: "transparent", border: 0, color: "#e5e7eb", cursor: "pointer" }}
                            >
                              {rootsOpen[rootNode.root] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            </button>
                          </div>
                        </div>

                        {rootsOpen[rootNode.root] &&
                          rootNode.groups.map((groupNode) => (
                            <div key={groupNode.path}>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: 8,
                                  padding: "10px 14px",
                                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                                  background: "var(--color-pilar-default-bg-dark)",
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ color: "#d1d5db", fontSize: 13 }}>{groupNode.path}</span>
                                  <Badge tone="neutral">{groupNode.items.length}</Badge>
                                </div>

                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <button
                                    onClick={() => applyPathGroup(groupNode.path, true)}
                                    style={{
                                      background: "transparent",
                                      border: "1px solid rgba(255,255,255,0.10)",
                                      color: "#cbd5e1",
                                      borderRadius: 8,
                                      padding: "3px 8px",
                                      cursor: "pointer",
                                      fontSize: 12,
                                    }}
                                  >
                                    Liberar
                                  </button>
                                  <button
                                    onClick={() => applyPathGroup(groupNode.path, false)}
                                    style={{
                                      background: "transparent",
                                      border: "1px solid rgba(255,255,255,0.10)",
                                      color: "#cbd5e1",
                                      borderRadius: 8,
                                      padding: "3px 8px",
                                      cursor: "pointer",
                                      fontSize: 12,
                                    }}
                                  >
                                    Remover
                                  </button>
                                  <button
                                    onClick={() => toggleGroup(groupNode.path)}
                                    style={{ background: "transparent", border: 0, color: "#e5e7eb", cursor: "pointer" }}
                                  >
                                    {groupsOpen[groupNode.path] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                  </button>
                                </div>
                              </div>

                              {groupsOpen[groupNode.path] && (
                                <div>
                                  <div style={{ ...rowStyle, fontSize: 12, color: "#9ca3af", background: "var(--color-pilar-default-bg-dark)" }}>
                                    <div>Permissao</div>
                                    <div style={{ textAlign: "left" }}>Global/Conceder</div>
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
                                          const nextStores = has ? base.stores.filter((i) => i !== storeId) : [...base.stores, storeId];
                                          return { ...prev, [p.code]: { ...base, stores: nextStores } };
                                        })
                                      }
                                      onSetAllStores={(on) =>
                                        setWorking((prev) => ({
                                          ...prev,
                                          [p.code]: { ...(prev[p.code] || EMPTY), stores: on ? stores.map((s) => s.id) : [] },
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

                <div style={{ display: "flex", gap: 10, alignItems: "center", color: "#9ca3af" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <CheckIcon fontSize="small" /> {Object.values(working).filter((x) => x.global).length} globais ativas
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <CloseIcon fontSize="small" /> {Object.values(working).filter((x) => !x.global && x.stores.length > 0).length} por loja com alguma selecao
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
