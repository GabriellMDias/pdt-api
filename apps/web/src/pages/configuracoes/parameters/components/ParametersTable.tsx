import { useEffect, useMemo, useState } from 'react';
import type { ParameterListItem, ParameterEffective } from '../types/parameters';
import Tag from '../../../../components/Tag';
import StoreSelect from '../../../../components/inputs/StoreSelect';
import DefaultButton from '../../../../components/inputs/DefaultButton';
import { ValueEditor } from './ValueEditors';
import { patchParameter } from '../services/parametersApi';
import SimpleTable, { type Column } from '../../../../components/table/SimpleTable';

type RowState = {
  value: any;
  saving: boolean;
  error: string | null;
};

// Normaliza o valor vindo do backend para o formato que o editor espera
function normalizeForEditor(type: ParameterListItem['type'], value: any) {
  switch (type) {
    case 'BOOL': {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'number') return value !== 0;
      if (typeof value === 'string') {
        const s = value.trim().toLowerCase();
        if (s === 'true' || s === '1') return true;
        if (s === 'false' || s === '0' || s === '') return false;
        return s === 'true';
      }
      return !!value;
    }
    case 'INT': {
      if (value === null || value === undefined || value === '') return null;
      if (typeof value === 'number' && Number.isInteger(value)) return value;
      const s = String(value).trim();
      return /^-?\d+$/.test(s) ? Number(s) : null;
    }
    case 'JSON': {
      if (value == null || value === '') return null;
      if (typeof value === 'object') return value;
      if (typeof value === 'string') {
        try { return JSON.parse(value); } catch { return null; }
      }
      return null;
    }
    case 'STRING':
    default:
      return value == null ? '' : String(value);
  }
}

// Serializa para string (a API exige string)
function toWireString(value: any, type: ParameterListItem['type']): string {
  switch (type) {
    case 'STRING':
      return value == null ? '' : String(value);
    case 'INT': {
      if (value == null || value === '') return '';
      const s = String(value).trim();
      if (/^-?\d+$/.test(s)) return s;
      throw new Error('Valor inválido: esperado inteiro');
    }
    case 'BOOL':
      return value ? 'true' : 'false';
    case 'JSON': {
      if (value == null || value === '') return '';
      try { return JSON.stringify(value); }
      catch { throw new Error('JSON inválido'); }
    }
    default:
      return String(value ?? '');
  }
}

export default function ParameterTable({
  token,
  items,
  selectedStoreId,
  onChangeStoreId,
  showStoreSelect,
  onOneSaved,
}: {
  token: string | null | undefined;
  items: ParameterListItem[];
  selectedStoreId: number | null;
  onChangeStoreId: (id: number | null) => void;
  showStoreSelect: boolean;
  onOneSaved: (eff: ParameterEffective) => void;
}) {
  // Estado por linha, indexado por code (preserva edições locais)
  const [rowState, setRowState] = useState<Record<string, RowState>>({});

  /**
   * 🔑 Reidratar/ressincronizar SEMPRE que `items` mudar
   * (ou seja, quando a requisição com o storeId atual terminar).
   * Evita “um passo atrás” ao trocar de loja.
   */
  useEffect(() => {
    setRowState(() => {
      const next: Record<string, RowState> = {};
      for (const it of items) {
        next[it.code] = {
          value: normalizeForEditor(it.type, it.value),
          saving: false,
          error: null,
        };
      }
      return next;
    });
  }, [items]);

  function updateRow(code: string, patch: Partial<RowState>) {
    setRowState((prev) => ({
      ...prev,
      [code]: { ...(prev[code] || { value: undefined, saving: false, error: null }), ...patch },
    }));
  }

  function isDisabled(it: ParameterListItem): boolean {
    if (it.scope === 'GLOBAL') return false;
    if (it.scope === 'STORE') return !selectedStoreId;
    // BOTH: pode salvar global (sem loja) ou override (com loja)
    return false;
  }

  function helperText(it: ParameterListItem): string | undefined {
    if (it.scope === 'STORE' && !selectedStoreId) return 'Selecione uma loja para salvar (escopo STORE).';
    if (it.scope === 'BOTH' && !selectedStoreId) return 'Sem loja selecionada: salvará como GLOBAL.';
    if (it.scope === 'BOTH' && selectedStoreId) return `Salvará override para a loja #${selectedStoreId}.`;
    return undefined;
  }

  async function handleSave(it: ParameterListItem) {
    const st = rowState[it.code] || { value: it.value, saving: false, error: null };
    const mustStore = it.scope === 'STORE';
    const useStore = it.scope === 'STORE' || (it.scope === 'BOTH' && selectedStoreId != null);
    const sid = useStore ? (selectedStoreId ?? undefined) : undefined;

    if (mustStore && !sid) {
      updateRow(it.code, { error: 'Selecione uma loja para salvar este parâmetro.' });
      return;
    }

    let wire: string;
    try {
      wire = toWireString(st.value, it.type);
    } catch (e: any) {
      updateRow(it.code, { error: e?.message || 'Valor inválido' });
      return;
    }

    updateRow(it.code, { saving: true, error: null });
    try {
      const eff = await patchParameter(token, it.code, wire, sid); // API recebe string
      onOneSaved(eff);
    } catch (e: any) {
      updateRow(it.code, { saving: false, error: e?.message || 'Erro ao salvar' });
      return;
    }
    updateRow(it.code, { saving: false });
  }

  // Colunas do SimpleTable
  const columns: Column<ParameterListItem>[] = useMemo(() => {
    return [
      {
        key: 'code',
        header: 'Código',
        width: 260,
        resizable: true,
        sortable: true,
        sortAccessor: (r) => r.code,
        cell: (row) => <span className="font-mono text-xs">{row.code}</span>,
        overflow: 'ellipsis',
      },
      {
        key: 'description',
        header: 'Descrição',
        width: 360,
        resizable: true,
        sortable: true,
        sortAccessor: (r) => r.description ?? '',
        cell: (row) => <span className="text-sm">{row.description}</span>,
        overflow: 'wrap',
      },
      {
        key: 'type',
        header: 'Tipo',
        width: 120,
        resizable: true,
        cell: (row) => <Tag className="border-gray-300 text-gray-700">{row.type}</Tag>,
        align: 'left',
      },
      {
        key: 'source',
        header: 'Fonte',
        width: 120,
        resizable: true,
        cell: (row) => (
          <Tag className={row.source === 'STORE' ? 'border-amber-400 text-amber-600' : 'border-sky-300 text-sky-700'}>
            {row.source || '—'}
          </Tag>
        ),
        align: 'left',
      },
      {
        key: 'value',
        header: 'Valor',
        width: 520,
        resizable: true,
        cell: (row) => {
          const st = rowState[row.code] || { value: row.value, saving: false, error: null };
          const disabled = isDisabled(row) || st.saving;
          const hint = helperText(row);
          return (
            <div className="space-y-1">
              <ValueEditor
                type={row.type}
                value={st.value}
                onChange={(v) => updateRow(row.code, { value: v })}
                disabled={disabled}
              />
              {!!hint && <p className="text-xs text-gray-500">{hint}</p>}
              {!!st.error && <p className="text-xs text-red-600">{st.error}</p>}
            </div>
          );
        },
        overflow: 'wrap',
      },
      {
        key: 'action',
        header: 'Ação',
        width: 140,
        resizable: true,
        cell: (row) => {
          const st = rowState[row.code] || { value: row.value, saving: false, error: null };
          const disabled = isDisabled(row) || st.saving;
          return (
            <DefaultButton
              onClick={() => handleSave(row)}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              disabled={disabled}
            >
              {st.saving ? 'Salvando…' : 'Salvar'}
            </DefaultButton>
          );
        },
        align: 'left',
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowState, selectedStoreId]);

  return (
    <div className="space-y-2">
      {showStoreSelect && (
        <div className="flex items-center justify-end gap-2">
          <span className="text-xs text-gray-600">Loja (para visualizar/editar overrides por loja):</span>
          <div className="min-w-[260px]">
            <StoreSelect
              value={selectedStoreId}
              onChange={onChangeStoreId}
              placeholder="Selecione a loja…"
              syncUrl={false}
              onlyActive
            />
          </div>
        </div>
      )}

      <SimpleTable<ParameterListItem>
        columns={columns}
        data={items}
        loading={false}
        stickyHeader={false}
        getRowKey={(r) => r.code}
      />
    </div>
  );
}
