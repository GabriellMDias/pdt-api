import { rowStyle } from "../styles";
import Chip from "./Chip";
import Badge from "./Badge";
import CheckIcon from "@mui/icons-material/Check";
import type { PermissionCatalogEntry, Store } from "../types";

export type PermissionValue = { global: boolean; stores: number[] };

type Props = {
  catalogItem: PermissionCatalogEntry;
  value: PermissionValue;
  original?: PermissionValue;
  stores: Store[];
  groupPath?: string;
  onToggleGlobal: (checked: boolean) => void;
  onToggleStore: (storeId: number) => void;
  onSetAllStores: (on: boolean) => void;
  changed: boolean;
};

export default function PermissionRow({
  catalogItem: p, value: state, stores,
  groupPath,
  onToggleGlobal, onToggleStore, onSetAllStores, changed
}: Props) {
  return (
    <div style={{ ...rowStyle, background: changed ? "rgba(0,85,59,0.10)" : "transparent" }}>
      {/* Coluna 1: label + code */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <strong style={{ color: "#f3f4f6" }}>{p.label}</strong>
          {changed && <Badge tone="info">alterado</Badge>}
        </div>
        <code style={{ fontSize: 12, color: "#9ca3af" }}>
          {groupPath ? `${groupPath}/${p.code}` : p.code}
        </code>
      </div>

      {/* Coluna 2: Global / Conceder */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#e5e7eb" }}>
          <input type="checkbox" checked={state.global} onChange={(e) => onToggleGlobal(e.target.checked)} />
          {p.useStorePermission ? "Global" : "Conceder"}
        </label>
      </div>

      {/* Coluna 3: Lojas (se por loja e NÃO global) */}
      <div>
        {p.useStorePermission ? (
          state.global ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--color-pilar-default-bg-light)" }}>
              <CheckIcon fontSize="small" />
              <span>Válido para todas as lojas</span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Chip label="Todas" selected={state.stores.length === stores.length && stores.length>0} onClick={() => onSetAllStores(true)} />
                <Chip label="Nenhuma" selected={state.stores.length === 0} onClick={() => onSetAllStores(false)} />
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {stores.map(s => (
                  <Chip key={s.id} label={`${s.storeName}`} selected={state.stores.includes(s.id)} onClick={() => onToggleStore(s.id)} />
                ))}
              </div>
            </div>
          )
        ) : (
          <div style={{ color: state.global ? "var(--color-pilar-default-bg-light)" : "#9ca3af" }}>
            {state.global ? "Permissão concedida" : "Permissão não concedida"}
          </div>
        )}
      </div>
    </div>
  );
}
