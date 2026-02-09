// src/pages/estoque/analise/AnaliseEstoqueDiaPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../../../components/Layout';
import { useAuth } from '../../../hooks/useAuth';
import SimpleTable, { type Column } from '../../../components/table/SimpleTable';

type ResumoDia = {
  data: string; // ISO timestamp
  custo_total_anterior: number;
  custo_total_final: number;
  dif_custo_total: number;
};

const API_BASE = ''; // same-origin

function authHeaders(token?: string | null): Record<string, string> {
  return {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function AnaliseEstoqueDiaPage() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const { token } = useAuth();

  // novos nomes + fallback para legados
  const storeIds = sp.get('storeIds') || sp.get('lojas') || ''; // "5,7"
  const date = sp.get('date') || sp.get('data') || '';          // "YYYY-MM-DD"

  const [rows, setRows] = useState<ResumoDia[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function formatNumber(n: number | null | undefined) {
    if (n == null) return '';
    return n.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  }

  useEffect(() => {
    if (!storeIds || !date) {
      setError('Parâmetros inválidos (storeIds e date são obrigatórios).');
      return;
    }
    const ac = new AbortController();
    setLoading(true);
    setError(null);

    const qs = new URLSearchParams({ storeIds, date });
    const url = `${API_BASE}/api/analysis/stock/diferenca-producao-transformado/no-dia?${qs.toString()}`;

    fetch(url, { signal: ac.signal, headers: authHeaders(token) })
      .then(async (r) => {
        const ct = r.headers.get('content-type') || '';
        if (!r.ok) {
          const text = await r.text();
          if (!ct.includes('application/json')) {
            throw new Error(`Erro HTTP ${r.status}. Resposta não é JSON.\n${text.slice(0, 200)}`);
          }
          throw new Error(text || `Erro HTTP ${r.status}`);
        }
        if (!ct.includes('application/json')) {
          const text = await r.text();
          throw new Error(`Resposta não-JSON recebida (talvez rota incorreta?):\n${text.slice(0, 200)}`);
        }
        return r.json();
      })
      .then((data: ResumoDia[]) => setRows(Array.isArray(data) ? data : []))
      .catch((e) => {
        if ((e as any).name !== 'AbortError') setError((e as any)?.message ?? 'Erro ao carregar');
      })
      .finally(() => setLoading(false));

    return () => ac.abort();
  }, [token, storeIds, date]);

  const columns: Column<ResumoDia>[] = [
    {
      key: 'data',
      header: 'Data/Hora',
      sortable: true,
      sortAccessor: (r) => Date.parse(r.data), // ordena por timestamp
      resizable: true,
      minWidth: 180,
      width: 220,
      cell: (r) =>
        new Date(r.data).toLocaleString('pt-BR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        }),
    },
    {
      key: 'custo_total_anterior',
      header: 'Custo total anterior',
      align: 'right',
      sortable: true,
      sortAccessor: (r) => r.custo_total_anterior,
      resizable: true,
      minWidth: 170,
      cell: (r) => formatNumber(r.custo_total_anterior),
    },
    {
      key: 'custo_total_final',
      header: 'Custo total final',
      align: 'right',
      sortable: true,
      sortAccessor: (r) => r.custo_total_final,
      resizable: true,
      minWidth: 170,
      cell: (r) => formatNumber(r.custo_total_final),
    },
    {
      key: 'dif_custo_total',
      header: 'Diferença',
      align: 'right',
      sortable: true,
      sortAccessor: (r) => r.dif_custo_total,
      resizable: true,
      minWidth: 140,
      cell: (r) => (
        <span className={r.dif_custo_total >= 0 ? 'text-emerald-600' : 'text-red-600'}>
          {formatNumber(r.dif_custo_total)}
        </span>
      ),
    },
  ];

  return (
    <Layout title={`Detalhe por Dia (${date || '—'})`}>
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-pilar-default-bg2-dark p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center rounded-xl px-3 py-2 bg-pilar-green text-white hover:opacity-95"
          >
            ← Voltar
          </button>
          {loading && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-400 border-t-pilar-green" />
          )}
        </div>

        {error && (
          <div className="mt-3 text-sm font-medium text-red-700 dark:text-red-400 break-words">
            <span className="mr-1">Erro:</span> {error}
          </div>
        )}

        <div className="mt-4">
          <SimpleTable<ResumoDia>
            columns={columns}
            data={rows}
            loading={loading}
            emptyMessage="Sem resultados"
            // mantém o visual igual ao da outra tela
            tableClassName="min-w-full border-collapse"
            headerWrapperClassName="bg-transparent"
            headerRowClassName="text-left text-sm text-neutral-600 dark:text-neutral-300"
            headerCellClassName="py-2 border-b border-neutral-200 dark:border-neutral-700"
            bodyClassName="text-sm"
            cellBaseClassName="py-2 border-b border-neutral-100 dark:border-neutral-700"
            rowBaseClassName="hover:bg-pilar-default-bg-light/40 dark:hover:bg-neutral-700/40"
            getRowKey={(_r, i) => i}
            // ordenação inicial por data/hora crescente
            defaultSort={{ key: 'data', direction: 'asc' }}
          />
        </div>
      </div>
    </Layout>
  );
}
