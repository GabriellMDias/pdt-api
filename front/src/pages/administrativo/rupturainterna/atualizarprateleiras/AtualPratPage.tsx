import { useState } from "react";
import Layout from "../../../../components/Layout";
import StoreSelect from "../../../../components/inputs/StoreSelect";
import DateRange from "../../../../components/inputs/DateRange";
import DefaultButton from "../../../../components/inputs/DefaultButton";
import { useAuth } from "../../../../hooks/useAuth";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import type { UpdatePratBody } from "./types";
import { useAtualPrat } from "./hooks/useAtualPrat";

export default function AtualPratPage() {
  const { token } = useAuth();
  const [sp, setSearchParams] = useSearchParams();

  
  const [loading, setLoading] = useState(false);
  const [selectedStoreId, onChangeStoreId] = useState<number | null>(null);
  const [dataInicial, setDataInicial] = useState<string>("");
  const [dataFinal, setDataFinal] = useState<string>("");

  const { updatePrat } = useAtualPrat(token)

  const onClickAtualizar = () => {
    const qs = new URLSearchParams(sp);
    setSearchParams(qs, { replace: true });
    atualizar()
  }

  const atualizar = async () => {
    try {
      setLoading(true)

      const params: UpdatePratBody = {
        storeId: selectedStoreId ?? 1,
        initialDate: dataInicial,
        finalDate: dataFinal
      }

      console.log(params)

      if (selectedStoreId === null) {
        throw Error("Selecione pelo menos uma loja!")
      }

      const resp = await updatePrat(params)

      console.log(resp)

      toast.success('Prateleiras atualizadas com sucesso!', {
      position: 'top-right',
      autoClose: 5000,
      hideProgressBar: false,
      pauseOnHover: true,
      draggable: true,
      theme: 'dark',})

      
      setLoading(false)
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
      setLoading(false)
    }
  }

  return (
    <Layout title="Atualizar Prateleira">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-[1px]">
          <div className="rounded-md bg-black/60 text-white px-3 py-2 text-sm">
            Carregando…
          </div>
        </div>
      )}

    {/* Filtros */}
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-pilar-default-bg2-dark p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="md:col-span-1">
            <label className="block text-xs text-neutral-600 dark:text-neutral-300 mb-1">
            Lojas
            </label>
            <StoreSelect
              value={selectedStoreId}
              onChange={onChangeStoreId}
              placeholder="Selecione a loja…"
              syncUrl
              onlyActive
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
                className="w-full md:w-auto"
                onClick={onClickAtualizar}
                >
                    Atualizar
                </DefaultButton>
            </div>
            </div>
        </div>
    </Layout>
  );
}
