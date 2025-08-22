import React, { useMemo, useState } from "react";
import Layout from "../../../components/Layout";
import { useAuth } from "../../../hooks/useAuth";
import SearchIcon from "@mui/icons-material/Search";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";

import { codeGroup } from "./utils";
import { rowStyle } from "./styles";
import Section from "./components/Section";
import Toolbar from "./components/Toolbar";
import UsersSidebar from "./components/UsersSidebar";
import PermissionRow from "./components/PermissionRow";
import Badge from "./components/Badge";
import type { PermissionCatalogEntry } from "./types";
import { usePermissionsData } from "./hooks/usePermissionsData";

export default function PermissionsPage() {
  const { token } = useAuth();
  const {
    users, stores, catalog,
    selectedUserId, setSelectedUserId,
    original, working, setWorking,
    loading, saving, error,
    changedCodes,
    resetChanges, reloadUserPerms, save, copyFromUser,
  } = usePermissionsData(token);

  // Filtros & UI locais
  const [userQuery, setUserQuery] = useState("");
  const [permQuery, setPermQuery] = useState("");
  const [groupsOpen, setGroupsOpen] = useState<Record<string, boolean>>({});
  const [copyFromId, setCopyFromId] = useState<number | "">("");

  // Inicializa grupos abertos quando catálogo mudar
  React.useEffect(() => {
    const g: Record<string, boolean> = {};
    for (const item of catalog) g[codeGroup(item.code)] = true;
    setGroupsOpen(g);
  }, [catalog]);

  const filteredCatalog = useMemo(() => {
    const q = permQuery.trim().toLowerCase();
    return q
      ? catalog.filter(p => `${p.code} ${p.label}`.toLowerCase().includes(q))
      : catalog;
  }, [catalog, permQuery]);

  const grouped = useMemo(() => {
    const map = new Map<string, PermissionCatalogEntry[]>();
    for (const item of filteredCatalog) {
      const g = codeGroup(item.code);
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(item);
    }
    return Array.from(map.entries())
      .sort((a,b)=>a[0].localeCompare(b[0]))
      .map(([g, list]) => [g, list.sort((a,b)=>a.label.localeCompare(b.label))] as const);
  }, [filteredCatalog]);

  const hasChanges = changedCodes.length > 0;
  const canSave = selectedUserId !== null && selectedUserId !== undefined;

  function toggleGroup(name: string, open?: boolean) {
    setGroupsOpen(prev => ({ ...prev, [name]: open ?? !prev[name] }));
  }

  return (
    <Layout title="Permissões">
      {/* grid único (removido grid duplo) */}
      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 16, alignItems: "start" }}>
        {/* Sidebar de usuários */}
        <UsersSidebar
          users={users}
          selectedUserId={selectedUserId}
          onSelectUser={setSelectedUserId}
          userQuery={userQuery}
          onChangeUserQuery={setUserQuery}
          copyFromId={copyFromId}
          onChangeCopyFromId={setCopyFromId}
          onCopyFrom={() => { if (copyFromId!=="" && copyFromId!==selectedUserId) copyFromUser(Number(copyFromId)); }}
        />

        {/* Editor de permissões */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Section
            title="Editor de permissões"
            right={<Toolbar canSave={canSave} saving={saving} onSave={save} onReset={resetChanges} onReload={reloadUserPerms} hasChanges={hasChanges} />}
          >
            {selectedUserId === null || selectedUserId === undefined ? (
              <div style={{ display: "grid", placeItems: "center", padding: 40, color: "#9ca3af" }}>
                <InfoOutlinedIcon style={{ marginBottom: 8 }} />
                Selecione um usuário à esquerda para editar.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Alertas */}
                {error && (
                  <div style={{ background: "var(--color-pilar-orange)", color: "#fee2e2", padding: 12, borderRadius: 8 }}>
                    <strong>Erro:</strong> {error}
                  </div>
                )}
                {hasChanges && (
                  <div style={{ background: "rgba(0,85,59,0.25)", color: "#dbeafe", padding: 12, borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
                    <InfoOutlinedIcon /> Você tem alterações não salvas em <strong style={{ marginLeft: 4 }}>{changedCodes.length}</strong> permissão(ões).
                  </div>
                )}
                {selectedUserId === 0 && (
                  <div style={{ background: "rgba(0,85,59,0.25)", color: "var(--color-pilar-default-bg-light)", padding: 12, borderRadius: 8 }}>
                    Usuário administrador (id = 0). No sistema, ele não sofre validação de permissões.
                  </div>
                )}

                {/* Filtro de permissões */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <SearchIcon />
                  <input
                    value={permQuery}
                    onChange={(e)=>setPermQuery(e.target.value)}
                    placeholder="Buscar permissão (código/label)..."
                    style={{
                      flex: 1,
                      background: "var(--color-pilar-default-bg-dark)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "#e5e7eb",
                      borderRadius: 8, padding: "6px 10px"
                    }}
                  />
                </div>

                {/* Lista por grupos */}
                <div style={{ padding: 0, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
                  {loading ? (
                    <div style={{ padding: 20, color: "#9ca3af" }}>Carregando permissões...</div>
                  ) : (
                    grouped.map(([groupName, items]) => (
                      <div key={groupName}>
                        <div
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "12px 14px",
                            borderBottom: "1px solid rgba(255,255,255,0.08)",
                            background: "var(--color-pilar-default-bg2-dark)"
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <strong style={{ color: "#f3f4f6" }}>{groupName}</strong>
                            <Badge tone="neutral">{items.length}</Badge>
                          </div>
                          <button
                            onClick={()=>toggleGroup(groupName)}
                            style={{ background: "transparent", border: 0, color: "#e5e7eb", cursor: "pointer" }}
                          >
                            {groupsOpen[groupName] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          </button>
                        </div>
                        {groupsOpen[groupName] && (
                          <div>
                            {/* Cabeçalho da grid */}
                            <div style={{ ...rowStyle, fontSize: 12, color: "#9ca3af", background: "var(--color-pilar-default-bg-dark)" }}>
                              <div>Permissão</div>
                              <div style={{ textAlign: "left" }}>Global/Conceder</div>
                              <div>Lojas (quando não global)</div>
                            </div>
                            {items.map(p => (
                              <PermissionRow
                                key={p.code}
                                catalogItem={p}
                                value={working[p.code] || { global: false, stores: [] }}
                                original={original[p.code]}
                                stores={stores}
                                onToggleGlobal={(checked) => setWorking(prev => ({ ...prev, [p.code]: { ...(prev[p.code] || { global:false, stores:[] }), global: checked } }))}
                                onToggleStore={(storeId) => setWorking(prev => {
                                  const base = prev[p.code] || { global:false, stores:[] };
                                  const has = base.stores.includes(storeId);
                                  const next = has ? base.stores.filter(i=>i!==storeId) : [...base.stores, storeId];
                                  return { ...prev, [p.code]: { ...base, stores: next } };
                                })}
                                onSetAllStores={(on) => setWorking(prev => ({ ...prev, [p.code]: { ...(prev[p.code] || { global:false, stores:[] }), stores: on ? stores.map(s=>s.id) : [] } }))}
                                changed={original[p.code] ? (original[p.code]!.global !== (working[p.code]?.global||false) || (original[p.code]!.stores||[]).slice().sort().join(',') !== ((working[p.code]?.stores)||[]).slice().sort().join(',')) : (working[p.code]?.global||false) || ((working[p.code]?.stores)||[]).length>0}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Rodapé com resumo */}
                <div style={{ display: "flex", gap: 10, alignItems: "center", color: "#9ca3af" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <CheckIcon fontSize="small" /> {Object.values(working).filter(x=>x.global).length} globais ativas
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <CloseIcon fontSize="small" /> {Object.values(working).filter(x=>!x.global && x.stores.length>0).length} por loja com alguma seleção
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