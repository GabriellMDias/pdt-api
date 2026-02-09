/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from 'react';
import { listParameters } from '../services/parametersApi';
import type { ParameterListItem } from '../types/parameters';

export type LoadState = 'idle' | 'loading' | 'success' | 'error';

export function useParameters(token: string | null | undefined, storeId: number | null) {
  const [state, setState] = useState<LoadState>('idle');
  const [items, setItems] = useState<ParameterListItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Evita condição de corrida (resposta antiga sobrescrevendo a nova)
  const seqRef = useRef(0);

  useEffect(() => {
    let alive = true;
    const mySeq = ++seqRef.current;

    async function run() {
      setState('loading');
      setError(null);
      try {
        const data = await listParameters(token, storeId ?? undefined);
        if (!alive) return;
        if (seqRef.current !== mySeq) return; // ignora respostas antigas
        setItems(data);
        setState('success');
      } catch (e: any) {
        if (!alive) return;
        if (seqRef.current !== mySeq) return;
        setError(e?.message || 'Erro ao carregar');
        setState('error');
      }
    }
    run();

    return () => { alive = false; };
  }, [token, storeId]);

  const groups = useMemo(() => {
    const map = new Map<string, ParameterListItem[]>();
    for (const it of items) {
      const key = it.group ?? 'sem_grupo';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }
    return map;
  }, [items]);

  const groupKeys = useMemo(() => Array.from(groups.keys()).sort(), [groups]);

  return { state, items, groups, groupKeys, error };
}