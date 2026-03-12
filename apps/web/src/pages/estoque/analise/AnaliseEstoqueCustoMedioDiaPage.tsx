import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../../../components/Layout';
import { useAuth } from '../../../hooks/useAuth';
import SimpleTable, { type Column } from '../../../components/table/SimpleTable';
import FullscreenLoader from '../../../components/loading/FullscreenLoader';

type ResumoDiaDetalhado = {
  id_loja: number;
  id_produto: number;
  data: string;
  diferenca: number;
};

const API_BASE = '';

function authHeaders(token?: string | null): Record<string, string> {
  return {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function AnaliseEstoqueCustoMedioDiaPage() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const { token } = useAuth();

  const storeIds = sp.get('storeIds') || sp.get('lojas') || '';
  const date = sp.get('date') || sp.get('data') || '';

  const [rows, setRows] = useState<ResumoDiaDetalhado[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function formatNumber(n: number | null | undefined, digits = 2) {
    if (n == null) return '';
    return n.toLocaleString('pt-BR', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  }

  useEffect(() => {
    if (!storeIds || !date) {
      setError('Parametros invalidos (storeIds e date sao obrigatorios).');
      return;
    }

    const ac = new AbortController();
    setLoading(true);
    setError(null);

    const qs = new URLSearchParams({ storeIds, date });
    const url = `${API_BASE}/api/analysis/stock/diferenca-custo-medioxultimo/no-dia?${qs.toString()}`;

    fetch(url, { signal: ac.signal, headers: authHeaders(token) })
      .then(async (r) => {
        const ct = r.headers.get('content-type') || '';
        if (!r.ok) {
          const text = await r.text();
          if (!ct.includes('application/json')) {
            throw new Error(
              `Erro HTTP ${r.status}. Resposta nao e JSON.\n${text.slice(0, 200)}`,
            );
          }
          throw new Error(text || `Erro HTTP ${r.status}`);
        }
        if (!ct.includes('application/json')) {
          const text = await r.text();
          throw new Error(
            `Resposta nao-JSON recebida (talvez rota incorreta?):\n${text.slice(0, 200)}`,
          );
        }
        return r.json();
      })
      .then((data: ResumoDiaDetalhado[]) => setRows(Array.isArray(data) ? data : []))
      .catch((e) => {
        if ((e as any).name !== 'AbortError') {
          setError((e as any)?.message ?? 'Erro ao carregar');
        }
      })
      .finally(() => setLoading(false));

    return () => ac.abort();
  }, [token, storeIds, date]);

  const columns: Column<ResumoDiaDetalhado>[] = [
    {
      key: 'data',
      header: 'Data/Hora',
      sortable: true,
      sortAccessor: (r) => Date.parse(r.data),
      resizable: true,
      minWidth: 180,
      width: 220,
      cell: (r) =>
        new Date(r.data).toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
    },
    {
      key: 'id_loja',
      header: 'Loja',
      align: 'right',
      sortable: true,
      sortAccessor: (r) => r.id_loja,
      resizable: true,
      minWidth: 90,
      width: 100,
      cell: (r) => formatNumber(r.id_loja, 0),
    },
    {
      key: 'id_produto',
      header: 'Produto',
      align: 'right',
      sortable: true,
      sortAccessor: (r) => r.id_produto,
      resizable: true,
      minWidth: 120,
      width: 130,
      cell: (r) => formatNumber(r.id_produto, 0),
    },
    {
      key: 'diferenca',
      header: 'Diferenca',
      align: 'right',
      sortable: true,
      sortAccessor: (r) => r.diferenca,
      resizable: true,
      minWidth: 140,
      cell: (r) => (
        <span className={r.diferenca >= 0 ? 'text-emerald-600' : 'text-red-600'}>
          {formatNumber(r.diferenca, 2)}
        </span>
      ),
    },
  ];

  return (
    <Layout title={`Custo Medio x Ultimo - Detalhe (${date || '-'})`}>
      <FullscreenLoader open={loading} label="Carregando detalhes..." />
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-pilar-default-bg2-dark p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center rounded-xl px-3 py-2 bg-pilar-green text-white hover:opacity-95"
          >
            {'<-'} Voltar
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
          <SimpleTable<ResumoDiaDetalhado>
            columns={columns}
            data={rows}
            loading={loading}
            emptyMessage="Sem resultados"
            tableClassName="min-w-full border-collapse"
            headerWrapperClassName="bg-transparent"
            headerRowClassName="text-left text-sm text-neutral-600 dark:text-neutral-300"
            headerCellClassName="py-2 border-b border-neutral-200 dark:border-neutral-700"
            bodyClassName="text-sm"
            cellBaseClassName="py-2 border-b border-neutral-100 dark:border-neutral-700"
            rowBaseClassName="hover:bg-pilar-default-bg-light/40 dark:hover:bg-neutral-700/40"
            getRowKey={(_r, i) => i}
            defaultSort={{ key: 'diferenca', direction: 'desc' }}
          />
        </div>
      </div>
    </Layout>
  );
}
