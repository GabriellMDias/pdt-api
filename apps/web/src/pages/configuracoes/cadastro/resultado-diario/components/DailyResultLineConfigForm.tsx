import React from "react";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { IconButton } from "../../../../../components/crud/primitives";
import type { Option } from "../../../../../components/inputs/MultiSelect";
import { fieldControlBaseClass } from "../../../../../components/inputs/styles";
import type {
  DailyResultLineConfig,
  DailyResultLineFormat,
  DailyResultLinePayload,
  DailyResultLineSourceType,
  DailyResultSumTerm,
  DailyResultTotalMode,
  DailyResultValueReference,
  DailyResultDreReconciliationGroup,
  DailyResultVrDreTerm,
  DailyResultDetailConfig,
  DailyResultDistributionStrategy,
} from "../types";
import {
  DEFAULT_DISTRIBUTION_STRATEGY_BY_SOURCE_FIELD,
  DETAIL_SOURCE_OPTIONS,
  DIRECT_FIELD_OPTIONS,
  DISTRIBUTION_STRATEGY_OPTIONS,
  FORMAT_OPTIONS,
  SOURCE_TYPE_OPTIONS,
} from "../types";

type FormProps = {
  initial?: Partial<DailyResultLineConfig>;
  lineOptions: Array<{ value: string; label: string }>;
  dreOptions: Option[];
  onCancel: () => void;
  onSubmit: (payload: DailyResultLinePayload, id?: number | string) => Promise<void>;
  submitting: boolean;
  maySubmit: boolean;
};

const selectClass = `${fieldControlBaseClass} cursor-pointer`;

type EditableVrDreTerm = {
  vrDreId: string | number;
  multiplier: 1 | -1;
};

export default function DailyResultLineConfigForm({
  initial,
  lineOptions,
  dreOptions,
  onCancel,
  onSubmit,
  submitting,
  maySubmit,
}: FormProps) {
  const [lineId, setLineId] = React.useState("");
  const [label, setLabel] = React.useState("");
  const [order, setOrder] = React.useState(1);
  const [sourceType, setSourceType] =
    React.useState<DailyResultLineSourceType>("DIRECT_FIELD");
  const [format, setFormat] = React.useState<DailyResultLineFormat>("money");
  const [visible, setVisible] = React.useState(true);
  const [active, setActive] = React.useState(true);
  const [bold, setBold] = React.useState(false);
  const [shade, setShade] = React.useState(false);

  const [sourceField, setSourceField] = React.useState("recBruta");
  const [distributionStrategy, setDistributionStrategy] = React.useState<
    DailyResultDistributionStrategy | ""
  >("PDT_RESULT_WITH_DIFFERENCE_APPORTIONMENT");

  const [numerator, setNumerator] = React.useState<DailyResultValueReference>({
    lineKey: "recBruta",
  });
  const [denominator, setDenominator] = React.useState<DailyResultValueReference>({
    lineKey: "recBruta",
  });
  const [baseMetric, setBaseMetric] = React.useState<DailyResultValueReference>({
    lineKey: "recBruta",
  });
  const [totalMode, setTotalMode] =
    React.useState<DailyResultTotalMode>("RATIO_OF_TOTALS");
  const [fixedTotalValue, setFixedTotalValue] = React.useState(1);

  const [terms, setTerms] = React.useState<DailyResultSumTerm[]>([
    { lineKey: "recBruta", multiplier: 1 },
  ]);

  const [vrDreTerms, setVrDreTerms] = React.useState<EditableVrDreTerm[]>([]);
  const [detailEnabled, setDetailEnabled] = React.useState(false);
  const [detailSourceKey, setDetailSourceKey] = React.useState("recBruta");
  const [detailLevels, setDetailLevels] = React.useState(1);

  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const sourceConfig = asRecord(initial?.sourceConfig);
    const calculationConfig = asRecord(initial?.calculationConfig);
    const detailConfig = readDetailConfig(
      asRecord(initial?.detailConfig),
      initial?.lineId ?? "",
    );

    setLineId(initial?.lineId ?? "");
    setLabel(initial?.label ?? "");
    setOrder(initial?.order ?? 1);
    setSourceType(normalizeEditableSourceType(initial?.sourceType));
    setFormat(initial?.format ?? "money");
    setVisible(initial?.visible ?? true);
    setActive(initial?.active ?? true);
    setBold(Boolean(initial?.bold));
    setShade(Boolean(initial?.shade));

    const nextSourceField =
      typeof sourceConfig?.sourceField === "string"
        ? sourceConfig.sourceField
        : "recBruta";
    setSourceField(nextSourceField);
    setDistributionStrategy(
      readDistributionStrategy(sourceConfig, nextSourceField),
    );

    setNumerator(readReference(calculationConfig?.numerator, "recBruta"));
    setDenominator(readReference(calculationConfig?.denominator, "recBruta"));
    setBaseMetric(readReference(calculationConfig?.baseMetric, "recBruta"));
    setTotalMode(
      calculationConfig?.totalMode === "FIXED_VALUE"
        ? "FIXED_VALUE"
        : "RATIO_OF_TOTALS",
    );
    setFixedTotalValue(
      typeof calculationConfig?.fixedTotalValue === "number"
        ? calculationConfig.fixedTotalValue
        : 1,
    );

    const nextTerms = Array.isArray(calculationConfig?.terms)
      ? calculationConfig.terms
          .map((term) => {
            const record = asRecord(term);
            if (typeof record?.lineKey !== "string" || !record.lineKey.trim()) {
              return null;
            }
            return {
              lineKey: record.lineKey,
              multiplier: record.multiplier === -1 ? -1 : 1,
            } as DailyResultSumTerm;
          })
          .filter((term): term is DailyResultSumTerm => Boolean(term))
      : [];
    setTerms(nextTerms.length > 0 ? nextTerms : [{ lineKey: "recBruta", multiplier: 1 }]);

    setVrDreTerms(readVrDreTerms(sourceConfig, initial?.vrDreId));
    setDetailEnabled(detailConfig.enabled);
    setDetailSourceKey(detailConfig.detailSourceKey);
    setDetailLevels(detailConfig.levels);
    setError(null);
  }, [initial]);

  const referenceOptions = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const option of lineOptions) map.set(option.value, option.label);
    for (const option of DIRECT_FIELD_OPTIONS) {
      if (!map.has(option.value)) map.set(option.value, `${option.value} - ${option.label}`);
    }
    return Array.from(map.entries()).map(([value, optionLabel]) => ({
      value,
      label: optionLabel,
    }));
  }, [lineOptions]);

  const dreReconciliationGroups = React.useMemo(
    () => readDreReconciliationGroups(asRecord(initial?.sourceConfig), lineId),
    [initial?.sourceConfig, lineId],
  );

  const disabled = submitting || !maySubmit;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = buildPayload();
    await onSubmit(payload, initial?.id);
  }

  function validate() {
    if (!lineId.trim()) return "Informe o identificador da linha.";
    if (!label.trim()) return "Informe a descricao da linha.";
    if (!Number.isInteger(order)) return "Informe uma ordem valida.";
    if (!sourceType) return "Informe o tipo da linha.";
    if (!format) return "Informe o formato da linha.";
    if (sourceType === "DIRECT_FIELD" && !sourceField) {
      return "Linha de campo direto precisa de um campo de origem.";
    }
    if (sourceType === "DIRECT_FIELD") {
      if (!distributionStrategy) {
        return "Campo direto precisa de uma estrategia de consolidacao.";
      }
      if (vrDreTerms.length === 0 && dreReconciliationGroups.length === 0) {
        return "Campo direto precisa de pelo menos um termo DRE VRMaster ou participar de um grupo de conciliacao DRE.";
      }
      for (const [index, term] of vrDreTerms.entries()) {
        const vrDreId = Number(term.vrDreId);
        if (!Number.isInteger(vrDreId) || vrDreId <= 0) {
          return `Informe o DRE VRMaster do termo ${index + 1}.`;
        }
        if (term.multiplier !== 1 && term.multiplier !== -1) {
          return `Informe se o termo ${index + 1} deve somar ou subtrair.`;
        }
      }
    }
    if (sourceType === "PARTICIPATION") {
      if (!numerator.lineKey || !denominator.lineKey) {
        return "Linha de participacao precisa de numerador e denominador.";
      }
      if (totalMode === "FIXED_VALUE" && !Number.isFinite(fixedTotalValue)) {
        return "Informe o valor total fixo da participacao.";
      }
    }
    if (sourceType === "SUM" && terms.filter((term) => term.lineKey).length === 0) {
      return "Linha de soma precisa de pelo menos um termo.";
    }
    if (detailEnabled) {
      const detailOption = selectedDetailSourceOption();
      if (!detailOption) {
        return "Selecione uma fonte de detalhamento valida.";
      }
      if (!detailOption.implementedLineIds.includes(lineId.trim())) {
        return `A fonte de detalhamento '${detailOption.label}' esta implementada apenas para a linha ${detailOption.implementedLineIds.join(", ")}.`;
      }
      if (!Number.isInteger(detailLevels) || detailLevels < 1) {
        return "Informe uma quantidade valida de niveis permitidos.";
      }
    }
    return null;
  }

  function buildPayload(): DailyResultLinePayload {
    const nextVrDreTerms = numericVrDreTerms();

    return {
      lineId: lineId.trim(),
      label: label.trim(),
      order,
      sourceType,
      format,
      visible,
      active,
      bold,
      shade,
      sourceConfig:
        sourceType === "DIRECT_FIELD"
          ? {
              sourceField,
              distributionStrategy,
              vrDreTerms: nextVrDreTerms,
              vrDreIds: nextVrDreTerms.map((term) => term.vrDreId),
              ...(dreReconciliationGroups.length > 0
                ? { dreReconciliationGroups }
                : {}),
            }
          : null,
      calculationConfig: buildCalculationConfig(),
      styleConfig: null,
      vrDreId: nextVrDreTerms[0]?.vrDreId ?? null,
      vrDreItemId: null,
      vrDreType: null,
      vrDreTotalizationType: null,
      detailConfig: buildDetailConfig(),
    };
  }

  function buildDetailConfig(): DailyResultDetailConfig {
    if (!detailEnabled) {
      return { enabled: false };
    }

    const detailOption = selectedDetailSourceOption();

    return {
      enabled: true,
      detailSourceType: detailOption?.detailSourceType ?? "CUSTOM_SOURCE",
      detailSourceKey: detailOption?.detailSourceKey ?? detailSourceKey,
      levels: detailLevels,
    };
  }

  function buildCalculationConfig() {
    if (sourceType === "PARTICIPATION") {
      return {
        numerator,
        denominator,
        baseMetric,
        totalMode,
        ...(totalMode === "FIXED_VALUE" ? { fixedTotalValue } : {}),
      };
    }

    if (sourceType === "SUM") {
      return {
        terms: terms
          .filter((term) => term.lineKey)
          .map((term) => ({
            lineKey: term.lineKey,
            multiplier: term.multiplier,
          })),
      };
    }

    return null;
  }

  function numericVrDreTerms(): DailyResultVrDreTerm[] {
    return vrDreTerms
      .map((term) => {
        const multiplier: 1 | -1 = term.multiplier === -1 ? -1 : 1;

        return {
          vrDreId: Number(term.vrDreId),
          multiplier,
        };
      })
      .filter((term) => Number.isInteger(term.vrDreId) && term.vrDreId > 0);
  }

  return (
    <form className="mx-auto w-full max-w-6xl space-y-5" autoComplete="off" onSubmit={submit}>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/35">
        <div className="flex items-center gap-3">
          <IconButton variant="default" onClick={onCancel} disabled={submitting} title="Voltar">
            <ChevronLeftIcon />
          </IconButton>
          <button
            className="cursor-pointer rounded-xl border border-pilar-green bg-pilar-green px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-pilar-green/90 disabled:cursor-not-allowed disabled:opacity-50"
            type="submit"
            disabled={disabled}
          >
            Salvar
          </button>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Os calculos continuam usando as fontes controladas pela API.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/30 dark:text-red-200">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel title="Dados principais" className="xl:col-span-2">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Field label="Identificador">
              <input className={fieldControlBaseClass} value={lineId} onChange={(e) => setLineId(e.target.value)} />
            </Field>
            <Field label="Ordem">
              <input
                className={fieldControlBaseClass}
                type="number"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
              />
            </Field>
            <Field label="Tipo">
              <select className={selectClass} value={sourceType} onChange={(e) => setSourceType(e.target.value as DailyResultLineSourceType)}>
                {SOURCE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Formato">
              <select
                className={selectClass}
                value={format}
                onChange={(e) => setFormat(e.target.value as DailyResultLineFormat)}
              >
                {FORMAT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Descricao" className="md:col-span-4">
              <input className={fieldControlBaseClass} value={label} onChange={(e) => setLabel(e.target.value)} />
            </Field>
          </div>
        </Panel>

        <Panel title="Exibicao">
          <div className="grid grid-cols-2 gap-3">
            <Toggle checked={visible} label="Visivel" onChange={setVisible} />
            <Toggle checked={active} label="Ativa" onChange={setActive} />
            <Toggle checked={bold} label="Negrito" onChange={setBold} />
            <Toggle checked={shade} label="Fundo destacado" onChange={setShade} />
          </div>
        </Panel>
      </section>

      {sourceType === "DIRECT_FIELD" && (
        <Panel title="Origem direta">
          <div className="space-y-3">
            <Field label="Campo de origem">
              <select className={selectClass} value={sourceField} onChange={(e) => handleSourceFieldChange(e.target.value)}>
                {DIRECT_FIELD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Estrategia de consolidacao">
              <select
                className={selectClass}
                value={distributionStrategy}
                onChange={(e) =>
                  setDistributionStrategy(e.target.value as DailyResultDistributionStrategy)
                }
              >
                <option value="">Selecione...</option>
                {DISTRIBUTION_STRATEGY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <div className="space-y-3">
              {dreReconciliationGroups.length > 0 && (
                <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/80 p-3 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-900/25 dark:text-emerald-100">
                  {dreReconciliationGroups.map((group) => (
                    <div key={group.groupId} className="space-y-1">
                      <p className="font-medium">Participa do grupo: {group.description}</p>
                      <p>Linhas locais: {group.localLineIds.join(", ")}</p>
                      <p>
                        Concilia com DRE VRMaster:{" "}
                        {group.vrDreTerms.map((term) => formatVrDreTermLabel(term, dreOptions)).join(" ")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              {vrDreTerms.length === 0 && (
                <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50/80 p-3 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900/55 dark:text-neutral-400">
                  Nenhum termo DRE adicionado.
                </div>
              )}
              {vrDreTerms.map((term, index) => (
                <div key={`${term.vrDreId}-${index}`} className="grid grid-cols-1 gap-3 rounded-lg border border-neutral-200 bg-neutral-50/80 p-3 md:grid-cols-[1fr_160px_auto] dark:border-neutral-700 dark:bg-neutral-900/55">
                  <Field label="DRE VRMaster">
                    <select
                      className={selectClass}
                      value={String(term.vrDreId)}
                      onChange={(e) => updateVrDreTerm(index, { vrDreId: e.target.value })}
                    >
                      <option value="">Selecione...</option>
                      {dreOptions.map((option) => (
                        <option key={String(option.value)} value={String(option.value)}>{option.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Operacao">
                    <select
                      className={selectClass}
                      value={term.multiplier}
                      onChange={(e) => updateVrDreTerm(index, { multiplier: Number(e.target.value) === -1 ? -1 : 1 })}
                    >
                      <option value={1}>Somar</option>
                      <option value={-1}>Subtrair</option>
                    </select>
                  </Field>
                  <div className="flex items-end">
                    <IconButton title="Remover termo DRE" variant="danger" onClick={() => removeVrDreTerm(index)}>
                      <DeleteIcon />
                    </IconButton>
                  </div>
                </div>
              ))}
              <IconButton title="Adicionar termo DRE" variant="green" onClick={addVrDreTerm}>
                <AddIcon />
              </IconButton>
            </div>
          </div>
        </Panel>
      )}

      {sourceType === "PARTICIPATION" && (
        <Panel title="Participacao / percentual">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
            <ReferenceEditor label="Numerador" value={numerator} options={referenceOptions} onChange={setNumerator} />
            <ReferenceEditor label="Denominador" value={denominator} options={referenceOptions} onChange={setDenominator} />
            <ReferenceEditor label="Metrica base" value={baseMetric} options={referenceOptions} onChange={setBaseMetric} />
            <Field label="Modo do total">
              <select className={selectClass} value={totalMode} onChange={(e) => setTotalMode(e.target.value as DailyResultTotalMode)}>
                <option value="RATIO_OF_TOTALS">Razao dos totais</option>
                <option value="FIXED_VALUE">Valor fixo</option>
              </select>
            </Field>
            {totalMode === "FIXED_VALUE" && (
              <Field label="Valor total fixo">
                <input
                  className={fieldControlBaseClass}
                  type="number"
                  step="0.0001"
                  value={fixedTotalValue}
                  onChange={(e) => setFixedTotalValue(Number(e.target.value))}
                />
              </Field>
            )}
          </div>
        </Panel>
      )}

      {sourceType === "SUM" && (
        <Panel title="Termos da soma">
          <div className="space-y-3">
            {terms.map((term, index) => (
              <div key={`${term.lineKey}-${index}`} className="grid grid-cols-1 gap-3 rounded-lg border border-neutral-200 bg-neutral-50/80 p-3 md:grid-cols-[1fr_160px_auto] dark:border-neutral-700 dark:bg-neutral-900/55">
                <Field label="Linha">
                  <select
                    className={selectClass}
                    value={term.lineKey}
                    onChange={(e) => updateTerm(index, { lineKey: e.target.value })}
                  >
                    {referenceOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Multiplicador">
                  <select
                    className={selectClass}
                    value={term.multiplier}
                    onChange={(e) => updateTerm(index, { multiplier: Number(e.target.value) === -1 ? -1 : 1 })}
                  >
                    <option value={1}>Somar</option>
                    <option value={-1}>Subtrair</option>
                  </select>
                </Field>
                <div className="flex items-end">
                  <IconButton title="Remover termo" variant="danger" onClick={() => removeTerm(index)} disabled={terms.length <= 1}>
                    <DeleteIcon />
                  </IconButton>
                </div>
              </div>
            ))}
            <IconButton title="Adicionar termo" variant="green" onClick={addTerm}>
              <AddIcon />
            </IconButton>
          </div>
        </Panel>
      )}

      <Panel title="Detalhamento da linha">
        <div className="space-y-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            O detalhamento permite abrir uma linha do Resultado Diario para visualizar sua composicao em uma tabela lateral.
            Atualmente apenas algumas linhas possuem detalhamento implementado.
          </p>

          <Toggle
            checked={detailEnabled}
            label="Habilitar detalhamento"
            onChange={setDetailEnabled}
          />

          {detailEnabled ? (
            <div className="grid grid-cols-1 gap-3 rounded-lg border border-neutral-200 bg-neutral-50/80 p-3 md:grid-cols-3 dark:border-neutral-700 dark:bg-neutral-900/55">
              <Field label="Fonte do detalhe">
                <select
                  className={selectClass}
                  value={detailSourceKey}
                  onChange={(event) => {
                    const nextKey = event.target.value;
                    const option = DETAIL_SOURCE_OPTIONS.find(
                      (item) => item.detailSourceKey === nextKey,
                    );
                    setDetailSourceKey(nextKey);
                    if (option) setDetailLevels(option.defaultLevels);
                  }}
                >
                  {DETAIL_SOURCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.detailSourceKey}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Chave tecnica">
                <input
                  className={`${fieldControlBaseClass} bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300`}
                  value={selectedDetailSourceOption()?.detailSourceKey ?? detailSourceKey}
                  readOnly
                />
              </Field>
              <Field label="Niveis permitidos">
                <input
                  className={fieldControlBaseClass}
                  type="number"
                  min={1}
                  max={5}
                  value={detailLevels}
                  onChange={(event) => setDetailLevels(Number(event.target.value))}
                />
              </Field>
              <div className="rounded-lg border border-blue-200 bg-blue-50/80 p-3 text-sm text-blue-800 dark:border-blue-900/60 dark:bg-blue-900/20 dark:text-blue-100 md:col-span-3">
                {selectedDetailSourceOption()?.implementedLineIds.includes(lineId.trim())
                  ? "Esta fonte de detalhe esta implementada para esta linha."
                  : `Fonte implementada apenas para: ${selectedDetailSourceOption()?.implementedLineIds.join(", ") ?? "-"}.`}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50/80 p-3 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900/55 dark:text-neutral-400">
              Esta linha nao possui detalhamento habilitado.
            </div>
          )}
        </div>
      </Panel>

    </form>
  );

  function addTerm() {
    setTerms((current) => [
      ...current,
      { lineKey: referenceOptions[0]?.value ?? "recBruta", multiplier: 1 },
    ]);
  }

  function removeTerm(index: number) {
    setTerms((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function updateTerm(index: number, patch: Partial<DailyResultSumTerm>) {
    setTerms((current) =>
      current.map((term, itemIndex) =>
        itemIndex === index ? { ...term, ...patch } : term,
      ),
    );
  }

  function addVrDreTerm() {
    setVrDreTerms((current) => [
      ...current,
      { vrDreId: "", multiplier: 1 },
    ]);
  }

  function removeVrDreTerm(index: number) {
    setVrDreTerms((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function updateVrDreTerm(index: number, patch: Partial<EditableVrDreTerm>) {
    setVrDreTerms((current) =>
      current.map((term, itemIndex) =>
        itemIndex === index ? { ...term, ...patch } : term,
      ),
    );
  }

  function selectedDetailSourceOption() {
    return DETAIL_SOURCE_OPTIONS.find(
      (option) => option.detailSourceKey === detailSourceKey,
    );
  }

  function handleSourceFieldChange(nextSourceField: string) {
    setSourceField(nextSourceField);
    setDistributionStrategy(
      DEFAULT_DISTRIBUTION_STRATEGY_BY_SOURCE_FIELD[
        nextSourceField as keyof typeof DEFAULT_DISTRIBUTION_STRATEGY_BY_SOURCE_FIELD
      ] ?? "",
    );
  }
}

function Panel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/30 ${className}`}>
      <h3 className="mb-3 text-sm font-semibold text-neutral-800 dark:text-neutral-100">{title}</h3>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">{label}</span>
      {children}
    </label>
  );
}

function Toggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50/80 p-3 text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900/55 dark:text-neutral-200">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-neutral-400 bg-white text-pilar-green accent-pilar-green focus:ring-pilar-green dark:border-neutral-600 dark:bg-pilar-default-bg-dark"
      />
      {label}
    </label>
  );
}

function ReferenceEditor({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: DailyResultValueReference;
  options: Array<{ value: string; label: string }>;
  onChange: (value: DailyResultValueReference) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2">
      <Field label={label}>
        <select
          className={selectClass}
          value={value.lineKey}
          onChange={(e) => onChange({ ...value, lineKey: e.target.value })}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </Field>
      <Field label="Escopo">
        <select
          className={selectClass}
          value={value.scope ?? "CURRENT"}
          onChange={(e) =>
            onChange({
              ...value,
              scope:
                e.target.value === "TOTAL"
                  ? "TOTAL"
                  : undefined,
            })
          }
        >
          <option value="CURRENT">Linha/coluna atual</option>
          <option value="TOTAL">Total geral</option>
        </select>
      </Field>
    </div>
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readReference(value: unknown, fallback: string): DailyResultValueReference {
  const record = asRecord(value);
  const lineKey = typeof record?.lineKey === "string" ? record.lineKey : fallback;
  const scope = record?.scope === "TOTAL" ? "TOTAL" : undefined;
  return { lineKey, scope };
}

function readDistributionStrategy(
  sourceConfig: Record<string, unknown> | null,
  sourceField: string,
): DailyResultDistributionStrategy | "" {
  const rawStrategy = sourceConfig?.distributionStrategy;
  if (
    rawStrategy === "PDT_RESULT_WITH_DIFFERENCE_APPORTIONMENT" ||
    rawStrategy === "VRMASTER_COST_CENTER_BASE_WITH_FALLBACK_APPORTIONMENT" ||
    rawStrategy === "VRMASTER_COST_CENTER_EXACT"
  ) {
    return rawStrategy;
  }

  return (
    DEFAULT_DISTRIBUTION_STRATEGY_BY_SOURCE_FIELD[
      sourceField as keyof typeof DEFAULT_DISTRIBUTION_STRATEGY_BY_SOURCE_FIELD
    ] ?? ""
  );
}

function readVrDreTerms(
  sourceConfig: Record<string, unknown> | null,
  fallbackVrDreId?: number | null,
) {
  const sourceConfigVrDreTerms = sourceConfig?.vrDreTerms;
  if (Array.isArray(sourceConfigVrDreTerms)) {
    return sourceConfigVrDreTerms
      .map((term) => {
        const record = asRecord(term);
        const vrDreId = Number(record?.vrDreId);
        if (!Number.isInteger(vrDreId) || vrDreId <= 0) return null;

        return {
          vrDreId,
          multiplier: record?.multiplier === -1 ? -1 : 1,
        } as EditableVrDreTerm;
      })
      .filter((term): term is EditableVrDreTerm => Boolean(term));
  }

  const sourceConfigVrDreIds = sourceConfig?.vrDreIds;
  if (Array.isArray(sourceConfigVrDreIds)) {
    return sourceConfigVrDreIds
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0)
      .map((vrDreId) => ({ vrDreId, multiplier: 1 as const }));
  }

  if (typeof fallbackVrDreId === "number" && fallbackVrDreId > 0) {
    return [{ vrDreId: fallbackVrDreId, multiplier: 1 as const }];
  }

  return [];
}

function readDreReconciliationGroups(
  sourceConfig: Record<string, unknown> | null,
  lineId: string,
): DailyResultDreReconciliationGroup[] {
  const rawGroups = Array.isArray(sourceConfig?.dreReconciliationGroups)
    ? sourceConfig.dreReconciliationGroups
    : sourceConfig?.dreReconciliationGroup
      ? [sourceConfig.dreReconciliationGroup]
      : [];

  return rawGroups
    .map((group) => {
      const record = asRecord(group);
      const groupId = typeof record?.groupId === "string" ? record.groupId : "";
      const description =
        typeof record?.description === "string" && record.description.trim()
          ? record.description
          : groupId;
      const localLineIds = Array.isArray(record?.localLineIds)
        ? record.localLineIds.filter((item): item is string => typeof item === "string")
        : [];
      const vrDreTerms = Array.isArray(record?.vrDreTerms)
        ? record.vrDreTerms
            .map((term) => {
              const termRecord = asRecord(term);
              const vrDreId = Number(termRecord?.vrDreId);
              if (!Number.isInteger(vrDreId) || vrDreId <= 0) return null;

              return {
                vrDreId,
                multiplier: termRecord?.multiplier === -1 ? -1 : 1,
              } as DailyResultVrDreTerm;
            })
            .filter((term): term is DailyResultVrDreTerm => Boolean(term))
        : [];

      if (!groupId.trim() || localLineIds.length === 0 || vrDreTerms.length === 0) {
        return null;
      }

      return {
        groupId,
        description,
        localLineIds,
        vrDreTerms,
      };
    })
    .filter((group): group is DailyResultDreReconciliationGroup => Boolean(group))
    .filter((group) => group.localLineIds.includes(lineId));
}

function formatVrDreTermLabel(term: DailyResultVrDreTerm, dreOptions: Option[]) {
  const option = dreOptions.find((item) => Number(item.value) === term.vrDreId);
  const label = option?.label ?? `DRE ${term.vrDreId}`;
  const sign = term.multiplier === -1 ? "-" : "+";

  return `${sign} ${label}`;
}

function readDetailConfig(
  detailConfig: Record<string, unknown> | null,
  lineId: string,
): Required<Pick<DailyResultDetailConfig, "enabled" | "detailSourceKey" | "levels">> {
  const defaultOption = DETAIL_SOURCE_OPTIONS[0];
  const fallbackOption =
    DETAIL_SOURCE_OPTIONS.find((option) =>
      option.implementedLineIds.includes(lineId),
    ) ?? defaultOption;

  if (!detailConfig) {
    return {
      enabled: fallbackOption.implementedLineIds.includes(lineId),
      detailSourceKey: fallbackOption.detailSourceKey,
      levels: fallbackOption.defaultLevels,
    };
  }

  const explicitDisabled =
    detailConfig.enabled === false || detailConfig.detailEnabled === false;
  const rawDetailSourceKey =
    typeof detailConfig.detailSourceKey === "string" && detailConfig.detailSourceKey.trim()
      ? detailConfig.detailSourceKey
      : fallbackOption.detailSourceKey;
  const option =
    DETAIL_SOURCE_OPTIONS.find((item) => item.detailSourceKey === rawDetailSourceKey) ??
    fallbackOption;
  const rawLevels =
    typeof detailConfig.levels === "number" && Number.isInteger(detailConfig.levels)
      ? detailConfig.levels
      : option.defaultLevels;
  const enabled =
    !explicitDisabled &&
    (detailConfig.enabled === true ||
      detailConfig.detailEnabled === true ||
      Boolean(detailConfig.detailSourceKey || detailConfig.detailSourceType));

  return {
    enabled,
    detailSourceKey: option.detailSourceKey,
    levels: Math.max(1, rawLevels),
  };
}

function normalizeEditableSourceType(
  sourceType?: DailyResultLineSourceType,
): DailyResultLineSourceType {
  if (
    sourceType === "DIRECT_FIELD" ||
    sourceType === "PARTICIPATION" ||
    sourceType === "SUM"
  ) {
    return sourceType;
  }

  return "DIRECT_FIELD";
}
