import { useState, useEffect } from "react";
import DateRange from "../../../components/inputs/DateRange";
import StoreMultiSelect from "../../../components/inputs/StoreMultiSelect";
import Layout from "../../../components/Layout";
import { useAuth } from "../../../hooks/useAuth";
import { useSearchParams } from "react-router-dom";
import ConstCenterMultiSelect from "../../../components/inputs/CostCenterMultiSelect";
import DefaultButton from "../../../components/inputs/DefaultButton";
import { useDRE } from "./hooks/useDRE";
import type { CostCenter, GetDREParams, Store, DREByCostCenter } from "./types";
import DRETable from "./components/DRETable";
import FullscreenLoader from "../../../components/loading/FullscreenLoader";
import { toast } from "react-toastify";

export default function ResultadoDiarioPage() {
  const { token } = useAuth();
  const [sp, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState<boolean>(false);

  const { fetchDREData, fetchCostCenters, fetchStores } = useDRE(token);

  // ======= Filtros (sincronizados pelos componentes) =======
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [selectedCostCenters, setSelectedCostCenters] = useState<string[]>([]);
  const [dataInicial, setDataInicial] = useState<string>("");
  const [dataFinal, setDataFinal] = useState<string>("");

  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [dreRows, setDreRows] = useState<DREByCostCenter[]>([]);

  useEffect(() => {
    async function fetchData() {
      const ccs = await fetchCostCenters();
      const strs = await fetchStores();
      setCostCenters(ccs);
      setStores(strs);
    }
    fetchData();
  }, [fetchCostCenters, fetchStores]);

  function onClickConsultar() {
    const qs = new URLSearchParams(sp);
    setSearchParams(qs, { replace: true });
    consultar();
  }

  async function consultar() {
    try {
      setLoading(true);

      const params: GetDREParams = {
        initialDate: dataInicial,
        finalDate: dataFinal,
        costCenterId: selectedCostCenters,
        storeId: selectedStores,
      };

      if (selectedStores.length === 0) {
        throw Error("Selecione pelo menos uma loja!")
      }

      const dreData = await fetchDREData(params);
      console.log("dreData: ", dreData);
      console.log("costCenters: ", costCenters);
      console.log("stores: ", stores);

      setDreRows(dreData ?? []);
      setLoading(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error(error.message, {
        position: 'top-right',
        autoClose: 5000,
        hideProgressBar: false,
        pauseOnHover: true,
        draggable: true,
        theme: 'dark',
      })
      setLoading(false);
    } finally {
      setLoading(false);
    }
    
  }

  return (
    <Layout title="Resultado Diário">
      <FullscreenLoader open={loading} label="Consultando Resultado Diário..." />
      {/* Filtros */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-pilar-default-bg2-dark p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-1">
            <label className="block text-xs text-neutral-600 dark:text-neutral-300 mb-1">
              Lojas
            </label>
            <StoreMultiSelect
              permissionCode="dre:consultar"
              value={selectedStores}
              onChange={(ids) => setSelectedStores(ids.map(String))}
              placeholder="Selecione as lojas..."
              autoSelectIfSingle
              onlyActive={true}
              className="w-full"
              // URL sync pelo próprio componente
              syncUrl
              urlParamKey="storeIds"
              legacyUrlKeys={["lojas"]}
              replaceHistory
            />
          </div>

          <div className="md:col-span-1">
            <label className="block text-xs text-neutral-600 dark:text-neutral-300 mb-1">
              Centro de Custo
            </label>
            <ConstCenterMultiSelect
              value={selectedCostCenters}
              onChange={(ids) => setSelectedCostCenters(ids.map(String))}
              placeholder="Selecione os centro custos..."
              onlyActive
              className="w-full"
              syncUrl
              urlParamKey="costCenterIds"
              legacyUrlKeys={["centrocustos"]}
              replaceHistory
              autoSelectAll={true}
            />
          </div>

          <div className="md:col-span-2">
            <DateRange
              start={dataInicial}
              end={dataFinal}
              onChange={({ start, end }) => {
                setDataInicial(start);
                setDataFinal(end);
              }}
              syncUrl
              startKey="initialDate"
              endKey="finalDate"
              startLegacyKeys={["dataInicial", "start"]}
              endLegacyKeys={["dataFinal", "end"]}
              replaceHistory
              autoOrder={false}
            />
          </div>

          <div className="flex items-end md:col-span-1">
            <DefaultButton
              type="submit"
              disabled={loading}
              className="w-full md:w-auto"
              onClick={onClickConsultar}
            >
              {loading ? "Consultando..." : "Consultar"}
            </DefaultButton>
          </div>
        </div>
      </div>

      {/* Tabela do DRE */}
      {dreRows.length > 0 && (
        <DRETable
          data={dreRows}
          costCenters={costCenters}
          stores={stores}
          selectedStoreIds={selectedStores}
          start={dataInicial}
          end={dataFinal}
        />
      )}
    </Layout>
  );
}
