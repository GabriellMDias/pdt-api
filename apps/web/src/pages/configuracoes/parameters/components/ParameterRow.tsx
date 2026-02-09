/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from 'react';
import type { ParameterListItem, ParameterEffective } from '../types/parameters';
import Tag from '../../../../components/Tag';
import { ValueEditor } from './ValueEditors';
import { patchParameter } from '../services/parametersApi';
import DefaultButton from '../../../../components/inputs/DefaultButton';

export default function ParameterRow({
  token,
  item,
  selectedStoreId,
  onSaved,
}: {
  token: string | null | undefined;
  item: ParameterListItem;
  selectedStoreId: number | null;
  onSaved: (eff: ParameterEffective) => void;
}) {
  const [value, setValue] = useState<any>(item.value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Habilita/Desabilita editor conforme escopo e seleção de loja
  const disabled = useMemo(() => {
    if (item.scope === 'GLOBAL') return false; // sempre pode editar global
    if (item.scope === 'STORE') return !selectedStoreId; // precisa escolher loja
    // BOTH: pode salvar global (sem loja) ou override (com loja)
    return false;
  }, [item.scope, selectedStoreId]);

  const helperText = useMemo(() => {
    if (item.scope === 'STORE' && !selectedStoreId) return 'Selecione uma loja para salvar.';
    if (item.scope === 'BOTH' && !selectedStoreId) return 'Sem loja selecionada: salvará como GLOBAL.';
    if (item.scope === 'BOTH' && selectedStoreId) return `Salvará override para a loja #${selectedStoreId}.`;
    return undefined;
  }, [item.scope, selectedStoreId]);

  async function handleSave() {
    setSaving(true); setError(null);
    try {
      // Regras: STORE => exige storeId; BOTH => usa storeId se existir; GLOBAL => sem storeId
      const mustStore = item.scope === 'STORE';
      const useStore = item.scope === 'STORE' || (item.scope === 'BOTH' && selectedStoreId != null);
      const sid = useStore ? selectedStoreId ?? undefined : undefined;
      if (mustStore && !sid) throw new Error('Selecione uma loja para salvar este parâmetro.');

      const eff = await patchParameter(
        token,
        item.code,
        value, // mantém tipo original (STRING/INT/BOOL/JSON)
        sid
      );
      onSaved(eff);
    } catch (e: any) {
      setError(e?.message || 'Erro ao salvar');
    } finally { setSaving(false); }
  }

  return (
    <tr className="border-b last:border-0">
      <td className="p-3 align-top font-mono text-xs text-gray-700">{item.code}</td>
      <td className="p-3 align-top text-sm">{item.description}</td>
      <td className="p-3 align-top"><Tag className="border-gray-300 text-gray-700">{item.type}</Tag></td>
      <td className="p-3 align-top"><Tag className={item.source === 'STORE' ? 'border-amber-400 text-amber-600' : 'border-sky-300 text-sky-700'}>{item.source || '—'}</Tag></td>
      <td className="p-3 align-top w-[40%]">
        <ValueEditor type={item.type} value={value} onChange={setValue} disabled={disabled || saving} />
        {helperText && <p className="mt-1 text-xs text-gray-500">{helperText}</p>}
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </td>
      <td className="p-3 align-top">
        <DefaultButton
          onClick={handleSave}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          disabled={saving || disabled}
        >
          {saving ? 'Salvando…' : 'Salvar'}
        </DefaultButton>
      </td>
    </tr>
  );
}