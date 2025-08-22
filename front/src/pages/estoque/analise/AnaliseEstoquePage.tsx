// src/pages/AnaliseEstoquePage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../../components/Layout';
import { useAuth } from '../../../hooks/useAuth';
import StoreMultiSelect from '../../../components/inputs/StoreMultiSelect';

type ResumoMes = {
  data: string;
  custo_total_anterior: number;
  custo_total_final: number;
  dif_custo_total: number;
};

const API_BASE = '';

function authHeaders(token?: string | null): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function AnaliseEstoquePage() {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [selectedStores, setSelectedStores] = useState<Array<string | number>>([]);
  const [dataInicial, setDataInicial] = useState('');
  const [dataFinal, setDataFinal] = useState('');
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ResumoMes[]>([]);
  const [error, setError] = useState<string | null>(null);

  function formatNumber(n: number | null | undefined) {
    if (n == null) return '';
    return n.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  }

  async function consultar() {
    setError(null);
    setRows([]);

    if (!selectedStores.length) {
      setError('Selecione pelo menos uma loja.');
      return;
    }
    if (!dataInicial || !dataFinal) {
      setError('Informe a data inicial e a data final.');
      return;
    }

    setLoading(true);
    try {
      const qs = new URLSearchParams({
        lojas: selectedStores.join(','),
        dataInicial,
        dataFinal,
      });
      const resp = await fetch(`${API_BASE}/api/stock-analysis/mes?${qs.toString()}`, {
        headers: authHeaders(token),
      });
      if (!resp.ok) throw new Error((await resp.text()) || 'Erro ao consultar análise');
      const data: ResumoMes[] = await resp.json();
      setRows(data);
    } catch (e: any) {
      setError(e?.message ?? 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  }

  function abrirDetalheDia(row: ResumoMes) {
    const qs = new URLSearchParams({
      lojas: selectedStores.join(','),
      data: row.data,
    });
    navigate(`/estoque/analises/dia?${qs.toString()}`);
  }

  return (
    <Layout title="Análise de Estoque - Mês">
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-pilar-default-bg2-dark p-5 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-1">
            <label className="block text-xs text-neutral-600 dark:text-neutral-300 mb-1">
              Lojas
            </label>
            <StoreMultiSelect
              permissionCode="stock-analysis:consultar"
              value={selectedStores}
              onChange={setSelectedStores}
              placeholder="Selecione as lojas..."
              autoSelectIfSingle
              onlyActive={true}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-xs text-neutral-600 dark:text-neutral-300 mb-1">
              Data inicial
            </label>
            <input
              type="date"
              className="w-full rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-pilar-default-bg-dark p-2 outline-none focus:ring-2 focus:ring-pilar-green"
              value={dataInicial}
              onChange={(e) => setDataInicial(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs text-neutral-600 dark:text-neutral-300 mb-1">
              Data final
            </label>
            <input
              type="date"
              className="w-full rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-pilar-default-bg-dark p-2 outline-none focus:ring-2 focus:ring-pilar-green"
              value={dataFinal}
              onChange={(e) => setDataFinal(e.target.value)}
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={consultar}
              disabled={loading}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 font-medium text-white bg-pilar-green hover:opacity-95 disabled:opacity-60"
            >
              {loading && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              )}
              {loading ? 'Consultando...' : 'Consultar'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-3 text-sm font-medium text-red-700 dark:text-red-400">
            <span className="mr-1">Erro:</span> {error}
          </div>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="text-left text-sm text-neutral-600 dark:text-neutral-300">
                <th className="py-2 border-b border-neutral-200 dark:border-neutral-700">Data</th>
                <th className="py-2 border-b border-neutral-200 dark:border-neutral-700">Custo total anterior</th>
                <th className="py-2 border-b border-neutral-200 dark:border-neutral-700">Custo total final</th>
                <th className="py-2 border-b border-neutral-200 dark:border-neutral-700">Diferença</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {rows.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="py-4 text-neutral-500">Sem resultados</td>
                </tr>
              )}
              {rows.map((r) => (
                <tr
                  key={r.data}
                  onDoubleClick={() => abrirDetalheDia(r)}
                  className="cursor-pointer hover:bg-pilar-default-bg-light/40 dark:hover:bg-neutral-700/40"
                  title="Duplo clique para ver o detalhe do dia"
                >
                  <td className="py-2 border-b border-neutral-100 dark:border-neutral-700">
                    {new Date(r.data).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-2 border-b border-neutral-100 dark:border-neutral-700">
                    {formatNumber(r.custo_total_anterior)}
                  </td>
                  <td className="py-2 border-b border-neutral-100 dark:border-neutral-700">
                    {formatNumber(r.custo_total_final)}
                  </td>
                  <td className={
                    'py-2 border-b border-neutral-100 dark:border-neutral-700 ' +
                    (r.dif_custo_total >= 0 ? 'text-emerald-600' : 'text-red-600')
                  }>
                    {formatNumber(r.dif_custo_total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mt-3 text-center text-xs text-neutral-500">
            Dê <strong>duplo clique</strong> em uma linha para abrir o detalhamento por dia.
          </p>
        </div>
      </div>
    </Layout>
  );
}
