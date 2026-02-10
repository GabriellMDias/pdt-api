import CheckIcon from "@mui/icons-material/Check";
import type { PermissionCatalogEntry, Store } from "../types";
import { rowStyle } from "../styles";
import Badge from "./Badge";
import Chip from "./Chip";

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
  catalogItem: p,
  value: state,
  stores,
  groupPath,
  onToggleGlobal,
  onToggleStore,
  onSetAllStores,
  changed,
}: Props) {
  return (
    <div
      style={rowStyle}
      className={`border-b border-neutral-200 ${
        changed
          ? "bg-emerald-50/75 dark:bg-emerald-500/10"
          : "bg-white dark:bg-transparent"
      } dark:border-white/10`}
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <strong className="text-sm text-neutral-800 dark:text-neutral-100">{p.label}</strong>
          {changed && <Badge tone="info">alterado</Badge>}
        </div>
        <code className="text-xs text-neutral-500 dark:text-neutral-400">
          {groupPath ? `${groupPath}/${p.code}` : p.code}
        </code>
      </div>

      <div className="flex items-center gap-2">
        <label className="inline-flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200">
          <input
            type="checkbox"
            checked={state.global}
            onChange={(e) => onToggleGlobal(e.target.checked)}
            className="h-4 w-4"
          />
          {p.useStorePermission ? "Global" : "Conceder"}
        </label>
      </div>

      <div>
        {p.useStorePermission ? (
          state.global ? (
            <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-200">
              <CheckIcon fontSize="small" />
              <span>Valido para todas as lojas</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Chip
                  label="Todas"
                  selected={state.stores.length === stores.length && stores.length > 0}
                  onClick={() => onSetAllStores(true)}
                />
                <Chip
                  label="Nenhuma"
                  selected={state.stores.length === 0}
                  onClick={() => onSetAllStores(false)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {stores.map((s) => (
                  <Chip
                    key={s.id}
                    label={s.storeName}
                    selected={state.stores.includes(s.id)}
                    onClick={() => onToggleStore(s.id)}
                  />
                ))}
              </div>
            </div>
          )
        ) : (
          <div
            className={`text-sm ${
              state.global
                ? "text-emerald-700 dark:text-emerald-200"
                : "text-neutral-500 dark:text-neutral-400"
            }`}
          >
            {state.global ? "Permissao concedida" : "Permissao nao concedida"}
          </div>
        )}
      </div>
    </div>
  );
}
