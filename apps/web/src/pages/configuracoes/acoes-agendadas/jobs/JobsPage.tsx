/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CloseIcon from "@mui/icons-material/Close";
import Layout from "../../../../components/Layout";
import { GridForm, type Column } from "../../../../components/crud/GridForm";
import PermissionGate from "../../../../components/PermissionGate";
import { useAuth } from "../../../../hooks/useAuth";

import { useJobsCrud } from "./hooks/useJobsCrud";
import type { Job, JobParameterDefinition, UpdateJobDto } from "./types";
import JobsForm from "./components/JobsForm";
import { scheduleToText } from "./helpers";
import { hasPermission, type PermissionBag } from "../../../../services/permission";
import { jobsApi } from "./api";
import { toast } from "react-toastify";
import DefaultButton from "../../../../components/inputs/DefaultButton";
import DefaultInput from "../../../../components/inputs/DefaultInput";

type JobParameterValue = string | string[];

export default function JobsPage() {
  const { token, permissions, userId } = useAuth();
  const perms = useMemo(() => (permissions ?? []) as PermissionBag, [permissions]);
  const isAdmin = userId === 0;
  const navigate = useNavigate();

  const { fetchAll, updateItem } = useJobsCrud(token);
  const [runningJobId, setRunningJobId] = useState<number | null>(null);
  const [paramsJob, setParamsJob] = useState<Job | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, JobParameterValue>>({});

  const columns: Column<Job>[] = useMemo(() => [
    { key: "id", header: "ID", width: "80px" },
    { key: "name", header: "Nome", width: "320px" },
    { key: "enabled", header: "Ativo", width: "80px", render: (r) => r.enabled ? "Sim" : "Nao" },
    { key: "schedule", header: "Agendamento", render: (r) => scheduleToText(r) },
  ], []);

  const canEdit = isAdmin ? (() => true) : (() => hasPermission(perms, "dbScripts:editar"));
  const canViewLogs = isAdmin || hasPermission(perms, "code-jobs:consultar");
  const canRunNow = isAdmin || hasPermission(perms, "code-jobs:executar");

  const runJob = async (job: Job, params?: Record<string, unknown>) => {
    if (runningJobId === job.id) return;

    setRunningJobId(job.id);
    try {
      await jobsApi.runNow(job.id, token, params);
      toast.success("Execucao manual enviada.", {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        pauseOnHover: true,
        draggable: true,
        theme: "dark",
      });
      setParamsJob(null);
      setParamValues({});
    } catch (e: any) {
      toast.error(`Falha ao executar: ${e?.message ?? e}`, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        pauseOnHover: true,
        draggable: true,
        theme: "dark",
      });
    } finally {
      setRunningJobId(null);
    }
  };

  const openRunParams = (job: Job) => {
    setParamValues(
      Object.fromEntries((job.parameters ?? []).map((param) => [param.name, param.type === "multi-select" ? [] : ""])),
    );
    setParamsJob(job);
  };

  const submitRunParams = async () => {
    if (!paramsJob) return;
    const params = Object.fromEntries(
      Object.entries(paramValues).filter(([, value]) =>
        Array.isArray(value) ? value.length > 0 : String(value ?? "").trim() !== "",
      ),
    );
    await runJob(paramsJob, Object.keys(params).length ? params : undefined);
  };

  const Grid = (
    <GridForm<Job, UpdateJobDto>
      title=""
      idOf={(row) => row.id}
      columns={columns}
      fetchAll={async () => fetchAll()}
      createItem={async () => console.log("")}
      updateItem={updateItem}
      deleteItem={async () => console.log("")}
      renderForm={(props: any) => {
        const initial = props.initial
          ? { ...props.initial, description: props.initial.description ?? undefined }
          : undefined;
        return <JobsForm {...props} initial={initial} />;
      }}
      canCreate={false}
      canEdit={canEdit}
      canDelete={false}
      actionsForRow={(row) => {
        if (!row) return [];
        const items = [];
        if (canViewLogs) {
          items.push({
            key: "logs",
            label: "Visualizar Logs",
            onClick: () => navigate(`/configuracoes/acoesagendadas/jobs/${row.id}/runs`),
          });
        }
        if (canRunNow) {
          items.push({
            key: "run",
            label: runningJobId === row.id ? "Executando..." : "Executar agora",
            disabled: runningJobId === row.id,
            onClick: async () => {
              if ((row.parameters?.length ?? 0) > 0) {
                openRunParams(row);
                return;
              }
              await runJob(row);
            },
          });
        }
        return items;
      }}
    />
  );

  return (
    <Layout title="Acoes agendadas">
      {isAdmin ? (
        Grid
      ) : (
        <PermissionGate required="jobss:consultar">
          {Grid}
        </PermissionGate>
      )}
      <RunJobParamsModal
        job={paramsJob}
        values={paramValues}
        loading={runningJobId === paramsJob?.id}
        onChange={(name, value) => setParamValues((current) => ({ ...current, [name]: value }))}
        onClose={() => {
          if (runningJobId !== null) return;
          setParamsJob(null);
          setParamValues({});
        }}
        onSubmit={submitRunParams}
      />
    </Layout>
  );
}

function RunJobParamsModal({
  job,
  values,
  loading,
  onChange,
  onClose,
  onSubmit,
}: {
  job: Job | null;
  values: Record<string, JobParameterValue>;
  loading: boolean;
  onChange: (name: string, value: JobParameterValue) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  if (!job) return null;

  const parameters = job.parameters ?? [];

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-neutral-900/45 px-4 backdrop-blur-sm dark:bg-black/60"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onClose();
      }}
      aria-modal="true"
      role="dialog"
    >
      <div className="w-full max-w-lg rounded-xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-pilar-default-bg-dark">
        <div className="flex items-start justify-between gap-3 border-b border-neutral-200 p-4 dark:border-white/10">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-neutral-800 dark:text-white">Executar job</h2>
            <p className="mt-1 text-xs text-neutral-500 dark:text-white/70">{job.name}</p>
          </div>
          <button
            type="button"
            className="text-neutral-500 transition-colors hover:text-neutral-700 disabled:opacity-50 dark:text-white/70 dark:hover:text-white"
            onClick={onClose}
            disabled={loading}
            aria-label="Fechar"
          >
            <CloseIcon fontSize="small" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          {parameters.map((parameter) => (
            <JobParameterField
              key={parameter.name}
              parameter={parameter}
              value={values[parameter.name] ?? ""}
              disabled={loading}
              onChange={(value) => onChange(parameter.name, value)}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-neutral-200 p-4 dark:border-white/10">
          <DefaultButton type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </DefaultButton>
          <DefaultButton type="button" onClick={onSubmit} disabled={loading}>
            {loading ? "Executando..." : "Executar agora"}
          </DefaultButton>
        </div>
      </div>
    </div>
  );
}

function JobParameterField({
  parameter,
  value,
  disabled,
  onChange,
}: {
  parameter: JobParameterDefinition;
  value: JobParameterValue;
  disabled: boolean;
  onChange: (value: JobParameterValue) => void;
}) {
  const label = `${parameter.label ?? parameter.name}${parameter.required ? " *" : ""}`;

  if (parameter.type === "boolean") {
    return (
      <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-neutral-300 text-pilar-green focus:ring-pilar-green"
          checked={value === "true"}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked ? "true" : "")}
        />
        <span>{label}</span>
      </label>
    );
  }

  if (parameter.type === "multi-select") {
    const selectedValues = Array.isArray(value) ? value : String(value ?? "").split(",").filter(Boolean);

    return (
      <div className="space-y-2">
        <div className="text-sm font-medium text-neutral-700 dark:text-neutral-200">{label}</div>
        <div className="space-y-2 rounded-lg border border-neutral-200 p-3 dark:border-white/10">
          {(parameter.options ?? []).map((option) => {
            const checked = selectedValues.includes(option.value);
            return (
              <label key={option.value} className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-neutral-300 text-pilar-green focus:ring-pilar-green"
                  checked={checked}
                  disabled={disabled}
                  onChange={(event) => {
                    const nextValues = event.target.checked
                      ? [...selectedValues, option.value]
                      : selectedValues.filter((item) => item !== option.value);
                    onChange(nextValues);
                  }}
                />
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>
        {parameter.description ? (
          <p className="text-xs text-neutral-500 dark:text-white/60">{parameter.description}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <DefaultInput
        label={label}
        type={parameter.type === "number" ? "number" : parameter.type === "date" ? "date" : "text"}
        value={String(value ?? "")}
        placeholder={parameter.placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
      {parameter.description ? (
        <p className="text-xs text-neutral-500 dark:text-white/60">{parameter.description}</p>
      ) : null}
    </div>
  );
}
