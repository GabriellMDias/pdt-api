import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../../../components/Layout';
import { useAuth } from '../../../hooks/useAuth';

type ResumoDia = {
  data: string; // timestamp
  custo_total_anterior: number;
  custo_total_final: number;
  dif_custo_total: number;
};

const API_BASE = ''; // same-origin

function authHeaders(token?: string | null): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function AnaliseEstoqueDiaPage() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const { token } = useAuth();

  const lojasParam = sp.get('lojas') || ''; // "5"
  const data = sp.get('data') || '';        // "YYYY-MM-DD"

  const [rows, setRows] = useState<ResumoDia[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function formatNumber(n: number | null | undefined) {
    if (n == null) return '';
    return n.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  }

  useEffect(() => {
    if (!lojasParam || !data) {
      setError('Parâmetros inválidos (lojas e data são obrigatórios).');
      return;
    }
    setLoading(true);
    setError(null);

    const qs = new URLSearchParams({ lojas: lojasParam, data });
    const ac = new AbortController();

    fetch(`${API_BASE}/api/stock-analysis/dia?${qs.toString()}`, {
      signal: ac.signal,
      headers: authHeaders(token),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.text()) || 'Erro ao carregar');
        return r.json();
      })
      .then((data: ResumoDia[]) => setRows(data))
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e?.message ?? 'Erro ao carregar');
      })
      .finally(() => setLoading(false));

    return () => ac.abort();
  }, [token, lojasParam, data]);

  return (
    <Layout title={`Detalhe por Dia (${data})`}>
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
          <div className="mt-3 text-sm font-medium text-red-700 dark:text-red-400">
            <span className="mr-1">Erro:</span> {error}
          </div>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="text-left text-sm text-neutral-600 dark:text-neutral-300">
                <th className="py-2 border-b border-neutral-200 dark:border-neutral-700">Data/Hora</th>
                <th className="py-2 border-b border-neutral-200 dark:border-neutral-700">Custo total anterior</th>
                <th className="py-2 border-b border-neutral-200 dark:border-neutral-700">Custo total final</th>
                <th className="py-2 border-b border-neutral-200 dark:border-neutral-700">Diferença</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-neutral-500">Sem resultados</td>
                </tr>
              )}
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-pilar-default-bg-light/40 dark:hover:bg-neutral-700/40">
                  <td className="py-2 border-b border-neutral-100 dark:border-neutral-700">{(new Date(r.data)).toLocaleString('pt-br', {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'})}</td>
                  <td className="py-2 border-b border-neutral-100 dark:border-neutral-700">{formatNumber(r.custo_total_anterior)}</td>
                  <td className="py-2 border-b border-neutral-100 dark:border-neutral-700">{formatNumber(r.custo_total_final)}</td>
                  <td className={`py-2 border-b border-neutral-100 dark:border-neutral-700 ${r.dif_custo_total >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatNumber(r.dif_custo_total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
