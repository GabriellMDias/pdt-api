import { useSearchParams } from "react-router-dom";
import Layout from "../../../components/Layout";
import { useState } from "react";
import type { CompareMode } from "./types";
import StoreMultiSelect from "../../../components/inputs/StoreMultiSelect";
import DateRange from "../../../components/inputs/DateRange";
import DefaultButton from "../../../components/inputs/DefaultButton";
import DefaultSelect from "../../../components/inputs/DefaultSelect";
import MonthYear, { type YearMonth } from "../../../components/inputs/MonthYear";
import GestaoaVistaTable from "./components/GestaoaVistaTable";

export default function GestaoaVistaPage() {
    const [sp, setSearchParams] = useSearchParams();

    // ======= Filtros (sincronizados pelos componentes) =======
    const [selectedStores, setSelectedStores] = useState<string[]>([]);
    const [dataInicial, setDataInicial] = useState<string>("");
    const [dataFinal, setDataFinal] = useState<string>("");
    const [compareMode, setCompareMode] = useState<CompareMode>('range')
    const [competencia, setCompetencia] = useState<YearMonth>("");

    const [refreshKey, setRefreshKey] = useState(0);

    function onClickConsultar() {
        const qs = new URLSearchParams(sp);
        setSearchParams(qs, { replace: true });
        setRefreshKey((k) => k + 1);
    }

    return (
        <Layout title="Gestão a Vista">
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
                    <label className="block text-xs text-neutral-600 dark:text-neutral-300 mb-1">Comparação</label>
                    <DefaultSelect
                        options={[
                            { value: "range", label: "Intervalo exato" },
                            { value: "month", label: "Mês" },
                        ]}
                        value={compareMode}
                        onChangeValue={(v) => setCompareMode((v as CompareMode) || "month")}
                        // URL sync
                        syncUrl
                        paramKey="compareMode"         // sugiro usar essa chave; fica mais semântico
                        legacyKeys={["comparacao"]}    // mantém compatibilidade com URLs antigas
                        replaceHistory
                    />
                </div>

                {/* troca os inputs conforme o modo */}
                { compareMode === 'range' ? (
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
                ) :
                    <div className="md:col-span-1">
                        <MonthYear
                            value={competencia}
                            onChange={setCompetencia}
                            label="Competência"
                            key="competencia"            // URL: ?competencia=YYYY-MM
                            legacyKeys={["comp", "mes"]} // aceita legadas e normaliza
                        />
                    </div>
                }

                

                <div className="flex items-end md:col-span-1">
                    <DefaultButton
                    type="submit"
                    className="w-full md:w-auto"
                    onClick={onClickConsultar}
                    >
                        Consultar
                    </DefaultButton>
                </div>
                </div>
            </div>

            <GestaoaVistaTable
                stores={selectedStores}
                initialDate={dataInicial}
                finalDate={dataFinal}
                mode={compareMode}
                competencia={competencia}     // opcional; usado se mode === 'month' e initial/final estiverem vazios
                refreshKey={refreshKey}
                className="mb-4"
            />
        </Layout>
    )
}