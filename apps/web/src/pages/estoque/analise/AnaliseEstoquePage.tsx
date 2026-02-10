import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../../components/Layout';
import { useAuth } from '../../../hooks/useAuth';
import StoreMultiSelect from '../../../components/inputs/StoreMultiSelect';
import SimpleTable, { type Column } from '../../../components/table/SimpleTable';
import DateRange from '../../../components/inputs/DateRange';

type ResumoMes = {
  data: string;
  custo_total_anterior: number;
  custo_total_final: number;
  dif_custo_total: number;
};

const API_BASE = '';

function authHeaders(token?: string | null): Record<string, string> {
  return {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function AnaliseEstoquePage() {
  const navigate = useNavigate();
  const { token } = useAuth();

  // estados controlados pelos inputs / URL (os próprios inputs sincronizam com a URL)
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [dataInicial, setDataInicial] = useState('');
  const [dataFinal, setDataFinal] = useState('');

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ResumoMes[]>([]);
  const [error, setError] = useState<string | null>(null);

  function formatNumber(n: number | null | undefined) {
    if (n == null) return '';
    return n.toLocaleString('pt-BR', {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    });
  }

  async function consultar(opts?: {
    storeIds?: string[];
    initialDate?: string;
    finalDate?: string;
  }) {
    setError(null);
    setRows([]);

    const storeIds = opts?.storeIds ?? selectedStores;
    const initialDate = opts?.initialDate ?? dataInicial;
    const finalDate = opts?.finalDate ?? dataFinal;

    if (!storeIds.length) {
      setError('Selecione pelo menos uma loja.');
      return;
    }
    if (!initialDate || !finalDate) {
      setError('Informe a data inicial e a data final.');
      return;
    }

    setLoading(true);
    try {
      const qs = new URLSearchParams({
        storeIds: storeIds.join(','),
        initialDate,
        finalDate,
      });

      const url = `${API_BASE}/api/analysis/stock/diferenca-producao-transformado/diario?${qs.toString()}`;
      const resp = await fetch(url, { headers: authHeaders(token) });

      const ct = resp.headers.get('content-type') || '';
      if (!resp.ok) {
        const text = await resp.text();
        if (!ct.includes('application/json')) {
          throw new Error(
            `Erro HTTP ${resp.status}. Resposta não é JSON.\n${text.slice(0, 200)}`
          );
        }
        throw new Error(text || `Erro HTTP ${resp.status}`);
      }
      if (!ct.includes('application/json')) {
        const text = await resp.text();
        throw new Error(
          `Resposta não-JSON recebida (talvez rota incorreta?):\n${text.slice(0, 200)}`
        );
      }

      const data: ResumoMes[] = await resp.json();
      setRows(data);
    } catch (e: any) {
      setError(e?.message ?? 'Erro inesperado');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function abrirDetalheDia(row: ResumoMes) {
    const dateOnly =
      typeof row.data === 'string' && row.data.length >= 10
        ? row.data.slice(0, 10)
        : row.data;

    const qs = new URLSearchParams({
      storeIds: selectedStores.join(','),
      date: dateOnly,
    });

    navigate(`/estoque/analises/dia?${qs.toString()}`);
  }

  function handleDatesChange({ start, end }: { start: string; end: string }) {
    setDataInicial(start);
    setDataFinal(end);
  }

  function coerceLocalDateOnly(input: string): Date | null {
    // pega o prefixo YYYY-MM-DD (mesmo se vier "YYYY-MM-DDT...") e monta Date local
    const m = input?.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    const y = Number(m[1]), mon = Number(m[2]), d = Number(m[3]);
    return new Date(y, mon - 1, d); // local midnight
  }

  function formatDatePTBR(input: string): string {
    const d = coerceLocalDateOnly(input) ?? new Date(input);
    return isNaN(d.getTime()) ? input : d.toLocaleDateString('pt-BR');
  }

  function sortKeyDate(input: string): number {
    const d = coerceLocalDateOnly(input) ?? new Date(input);
    return isNaN(d.getTime()) ? Number.NEGATIVE_INFINITY : d.getTime();
  }

  const columns: Column<ResumoMes>[] = [
    {
      key: 'data',
      header: 'Data',
      sortable: true,
      sortAccessor: (r) => sortKeyDate(r.data),
      resizable: true,
      cell: (r) => formatDatePTBR(r.data),
    },
    {
      key: 'custo_total_anterior',
      header: 'Custo total anterior',
      align: 'right',
      sortable: true,
      sortAccessor: (r) => r.custo_total_anterior,
      resizable: true,
      cell: (r) => formatNumber(r.custo_total_anterior),
    },
    {
      key: 'custo_total_final',
      header: 'Custo total final',
      align: 'right',
      sortable: true,
      sortAccessor: (r) => r.custo_total_final,
      resizable: true,
      cell: (r) => formatNumber(r.custo_total_final),
    },
    {
      key: 'dif_custo_total',
      header: 'Diferença',
      align: 'right',
      sortable: true,
      sortAccessor: (r) => r.dif_custo_total,
      resizable: true,
      cell: (r) => (
        <span className={r.dif_custo_total >= 0 ? 'text-emerald-600' : 'text-red-600'}>
          {formatNumber(r.dif_custo_total)}
        </span>
      ),
    },
  ];

  return (
    <Layout title="Análise de Estoque - Mês">
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white/95 dark:bg-pilar-default-bg2-dark p-5 shadow-sm text-neutral-800 dark:text-neutral-100">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-5">
            <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">
              Lojas
            </label>
            <StoreMultiSelect
              permissionCode="stock-analysis:consultar"
              value={selectedStores}
              onChange={(ids) => setSelectedStores(ids.map(String))}
              placeholder="Selecione as lojas..."
              autoSelectIfSingle
              onlyActive={true}
              className="w-full"
              // continua sincronizando com a URL, mas sem auto-consultar
              syncUrl
              urlParamKey="storeIds"
              legacyUrlKeys={['lojas']}
              replaceHistory
            />
          </div>

          <div className="xl:col-span-5">
            <DateRange
              start={dataInicial}
              end={dataFinal}
              onChange={handleDatesChange}
              // sem onEnter -> só consulta no botão
              syncUrl
              startKey="initialDate"
              endKey="finalDate"
              startLegacyKeys={['dataInicial', 'start']}
              endLegacyKeys={['dataFinal', 'end']}
              replaceHistory
              autoOrder={false} // não reordenar durante digitação
            />
          </div>

          <div className="flex items-end xl:col-span-2">
            <button
              onClick={() => consultar()}
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-pilar-green bg-pilar-green px-4 py-2 font-medium text-white shadow-sm transition-colors hover:bg-pilar-green/90 disabled:opacity-60"
            >
              {loading && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              )}
              {loading ? 'Consultando...' : 'Consultar'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 break-words dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
            <span className="mr-1">Erro:</span> {error}
          </div>
        )}

        <div className="mt-4">
          <SimpleTable<ResumoMes>
            columns={columns}
            data={rows}
            loading={loading}
            emptyMessage="Sem resultados"
            wrapperClassName="rounded-xl border border-neutral-200 bg-white/80 dark:border-neutral-700 dark:bg-transparent"
            tableClassName="min-w-full border-collapse text-neutral-800 dark:text-neutral-100"
            headerWrapperClassName="bg-neutral-50 dark:bg-neutral-900/30"
            headerRowClassName="text-left text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-300"
            headerCellClassName="py-3 border-b border-neutral-200 font-semibold dark:border-neutral-700"
            bodyClassName="text-sm text-neutral-700 dark:text-neutral-100"
            cellBaseClassName="py-2.5 border-b border-neutral-200/80 dark:border-neutral-700"
            rowBaseClassName="cursor-pointer transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700/40"
            defaultSort={{ key: 'data', direction: 'asc' }}
            getRowKey={(r) => r.data}
            onRowDoubleClick={(r) => abrirDetalheDia(r)}
          />
          <p className="mt-3 text-center text-xs text-neutral-500 dark:text-neutral-400">
            Dê <strong>duplo clique</strong> em uma linha para abrir o detalhamento por dia.
          </p>
        </div>
      </div>
    </Layout>
  );
}
