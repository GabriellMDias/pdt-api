import { useEffect, useMemo, useState } from "react";
import DefaultButton from "../../../components/inputs/DefaultButton";
import DefaultSelect from "../../../components/inputs/DefaultSelect";
import StoreMultiSelect from "../../../components/inputs/StoreMultiSelect";
import Layout from "../../../components/Layout";
import SingleDate from "../../../components/inputs/SingleDate";
import { useSearchParams } from "react-router-dom";
import type { AnalysisType, CompareMode } from "./types";
import { useConcContab } from "./hooks/useConcContab";
import { toast } from "react-toastify";
import type { Column } from "../../../components/table/SimpleTable";
import SimpleTable from "../../../components/table/SimpleTable";
import ContentLoader from "../../../components/loading/ContentLoader";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatCell(value: any, dataType: string) {
    if (value == null) return "";

    switch (dataType) {
        case "decimal":
            return Number(value).toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            });
        case "int":
            return Number(value);
        case "boolean":
            return value ? "Sim" : "Não";
        case "date":
            return new Date(value).toLocaleDateString("pt-BR");
        case "datetime":
            return new Date(value).toLocaleString("pt-BR");
        default:
            return String(value);
    }
}


export default function ConcContabPage () {
    const [sp, setSearchParams] = useSearchParams();

    // ======= Filtros (sincronizados pelos componentes) =======
    const [selectedStores, setSelectedStores] = useState<string[]>([]);
    const [analysisTypes, setAnalysisTypes] = useState<AnalysisType[]>([]);
    const [consulta, setConsulta] = useState<string>(""); // selecionado
    const [compareMode, setCompareMode] = useState<CompareMode>('divergente')
    const [date, setDate] = useState<string>("");

    const [hasSearched, setHasSearched] = useState(false);

    // resultado bruto da API
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [rows, setRows] = useState<Record<string, any>[]>([]);

    const [consultaAplicada, setConsultaAplicada] = useState<string>("");

    const [loading, setLoading] = useState<boolean>(false);

    const  { fetchConcContabAnalysesTypes, fetchConcContab }  = useConcContab()

    useEffect(() => {
        let mounted = true;

        fetchConcContabAnalysesTypes()
            .then((res) => {
                if (!mounted) return;

                setAnalysisTypes(res);

                // opcional: auto-selecionar o primeiro
                if (res.length > 0) {
                    setConsulta(res[0].code);
                    setConsultaAplicada(res[0].code);
                }
            })
            .catch((err) => {
                console.error("Erro ao carregar tipos de análise", err);
            });

        return () => {
            mounted = false;
        };
    }, [fetchConcContabAnalysesTypes]);

    const analysisOptions = analysisTypes.map((a) => ({
        value: a.code,
        label: a.description,
    }));

    const selectedAnalysisType = analysisTypes.find((a) => a.code === consultaAplicada);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tableColumns: Column<Record<string, any>>[] = useMemo(() => {
        if (!selectedAnalysisType) return [];

        return [...selectedAnalysisType.fields]
            .sort((a, b) => a.order - b.order)
            .map((f) => ({
                key: f.key,
                header: f.label,
                align:
                    f.dataType === "decimal" || f.dataType === "int"
                        ? "right"
                        : "left",
                cell: (row) => formatCell(row[f.key], f.dataType),
                resizable: true,
                overflow: "wrap",
            }));
    }, [selectedAnalysisType]);



    async function onClickConsultar() {
        try {
            setLoading(true)

            const qs = new URLSearchParams(sp);
            setSearchParams(qs, { replace: true });

            const result = await fetchConcContab({date, compareMode, consulta, storeIds: selectedStores})

            setRows(Array.isArray(result) ? result : []);

            setConsultaAplicada(consulta);

            setHasSearched(true);

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
        <Layout title="Conciliações Contábeis">
            <ContentLoader open={loading} label="Consultando..." />
            {/* Filtros */}
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-pilar-default-bg2-dark p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="md:col-span-1">
                        <SingleDate
                            label="Data"
                            value={date}
                            onChange={setDate}
                            syncUrl
                            key="date"
                            legacyKeys={["data", "dt"]}
                            replaceHistory
                        />
                    </div>

                    <div className="md:col-span-1">
                        <label className="block text-xs text-neutral-600 dark:text-neutral-300 mb-1">
                        Lojas
                        </label>
                        <StoreMultiSelect
                        permissionCode="cost-center-comparative:consultar"
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
                            Consulta
                        </label>

                        <DefaultSelect
                        options={analysisOptions}
                        value={consulta}
                        onChangeValue={(v) => setConsulta(String(v))}
                        syncUrl
                        paramKey="consulta"
                        legacyKeys={["tipoConsulta"]}
                        replaceHistory
                        />
                    </div>

                    <div className="md:col-span-1">
                        <label className="block text-xs text-neutral-600 dark:text-neutral-300 mb-1">Comparação</label>
                        <DefaultSelect
                            options={[
                                { value: "divergente", label: "Divergente" },
                                { value: "todos", label: "Todos" },
                            ]}
                            value={compareMode}
                            onChangeValue={(v) => setCompareMode((v as CompareMode) || "todos")}
                            // URL sync
                            syncUrl
                            paramKey="compareMode"         // sugiro usar essa chave; fica mais semântico
                            legacyKeys={["comparacao"]}    // mantém compatibilidade com URLs antigas
                            replaceHistory
                        />
                    </div>                

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

            {hasSearched && selectedAnalysisType && (rows.length > 0 ? (
                <div className="rounded-lg border dark:border-neutral-700 bg-white dark:bg-pilar-default-bg2-dark text-neutral-900 dark:text-neutral-100 shadow">
                    <div className="px-4 py-3 border-b dark:border-neutral-700">
                    <h3 className="text-lg font-semibold">
                        {selectedAnalysisType.description}
                    </h3>
                    </div>

                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any*/}
                    <SimpleTable<Record<string, any>>
                    columns={tableColumns}
                    data={rows}
                    loading={loading}
                    emptyMessage="Nenhum registro encontrado."
                    stickyHeader

                    wrapperClassName="max-h-[calc(100vh-260px)] overflow-auto"
                    tableClassName="w-full text-sm text-left border-collapse"

                    headerWrapperClassName="bg-neutral-50 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                    headerCellClassName="border border-neutral-200 dark:border-neutral-700 text-[11px] font-semibold uppercase tracking-wide"

                    rowBaseClassName=""
                    cellBaseClassName="border border-neutral-200 dark:border-neutral-700"

                    rowClassName={(_row, i) =>
                        `${i % 2 === 0 ? "bg-white dark:bg-transparent" : "bg-neutral-50/60 dark:bg-neutral-900/20"} hover:bg-neutral-100/70 dark:hover:bg-neutral-800/60`
                    }

                    exportOptions={{
                        enabled: true,
                        excel: true,
                        pdf: true,
                        filename: selectedAnalysisType.code,
                        sheetName: selectedAnalysisType.description,
                        pdfOptions: { orientation: "landscape", title: selectedAnalysisType.description },
                    }}
                    />
                </div>) : (
                    /* ===== MENSAGEM DE VAZIO ===== */
                    <div className="rounded-lg border border-dashed border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-900/40 p-8 text-center text-neutral-700 dark:text-neutral-300">
                    <p className="text-sm">
                        Nenhum resultado encontrado.
                    </p>
                    </div>
                )
            )}
        </Layout>
    )
}