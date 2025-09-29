import React from "react";
import { IconButton } from "../../../../components/crud/primitives";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";

import DefaultInput from "../../../../components/inputs/DefaultInput";
import DefaultSelect from "../../../../components/inputs/DefaultSelect";
import DefaultTextarea from "../../../../components/inputs/DefaultTextarea";
import DefaultCheckbox from "../../../../components/inputs/DefaultCheckbox";
import DefaultButton from "../../../../components/inputs/DefaultButton";
import TimezoneSelect from "../../../../components/inputs/TimezoneSelect";

type ScheduleType = "CRON" | "INTERVAL" | "DAILY_AT" | "WEEKLY_AT";

type Initial = {
  id?: number;
  name?: string;
  description?: string;
  sqlText?: string;
  wrapInTransaction?: boolean;
  searchPath?: string;
  timeoutSec?: number;
  enabled?: boolean;

  scheduleType?: ScheduleType;
  cronExpression?: string;
  intervalSeconds?: number;
  dailyTime?: string;
  weeklyWeekday?: number;
  weeklyTime?: string;
  timezone?: string;
};

type Props = {
  initial?: Initial;
  onCancel: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSubmit: (payload: any, id?: number) => Promise<void> | void;
  submitting?: boolean;
  isEdit?: boolean;
  maySubmit?: boolean;
};

export default function DbScriptForm({
  initial,
  onCancel,
  onSubmit,
  submitting = false,
  isEdit = false,
  maySubmit = true,
}: Props) {
  const [name, setName] = React.useState(initial?.name ?? "");
  const [description, setDescription] = React.useState(initial?.description ?? "");
  const [sqlText, setSqlText] = React.useState(initial?.sqlText ?? "");
  const [wrapInTransaction, setWrapInTransaction] = React.useState(Boolean(initial?.wrapInTransaction));
  const [searchPath, setSearchPath] = React.useState(initial?.searchPath ?? "");
  const [timeoutSec, setTimeoutSec] = React.useState<number>(initial?.timeoutSec ?? 600);
  const [enabled, setEnabled] = React.useState<boolean>(initial?.enabled ?? true);

  const [scheduleType, setScheduleType] = React.useState<ScheduleType>(initial?.scheduleType ?? "CRON");
  const [cron, setCron] = React.useState(initial?.cronExpression ?? "0 0 * * * *");
  const [intervalSec, setIntervalSec] = React.useState<number>(initial?.intervalSeconds ?? 3600);
  const [dailyTime, setDailyTime] = React.useState(initial?.dailyTime ?? "09:00");
  const [weeklyWeekday, setWeeklyWeekday] = React.useState<number>(initial?.weeklyWeekday ?? 1);
  const [weeklyTime, setWeeklyTime] = React.useState(initial?.weeklyTime ?? "09:00");
  const [timezone, setTimezone] = React.useState(initial?.timezone ?? "America/Sao_Paulo");

  const canSubmitLocal = () => {
    if (!name.trim() || !sqlText.trim()) return false;
    switch (scheduleType) {
      case "CRON": return Boolean(cron.trim());
      case "INTERVAL": return Number(intervalSec) > 0;
      case "DAILY_AT": return Boolean(dailyTime.trim());
      case "WEEKLY_AT": return Number(weeklyWeekday) >= 0 && Boolean(weeklyTime.trim());
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmitLocal() || !maySubmit) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = {
      name,
      description,
      sqlText,
      enabled,
      wrapInTransaction,
      searchPath: searchPath || undefined,
      timeoutSec,
      scheduleType,
    };
    switch (scheduleType) {
      case "CRON":
        payload.cron = { cron, timezone };
        break;
      case "INTERVAL":
        payload.interval = { everySeconds: Number(intervalSec) || 0 };
        break;
      case "DAILY_AT":
        payload.dailyAt = { time: dailyTime, timezone };
        break;
      case "WEEKLY_AT":
        payload.weeklyAt = { weekday: Number(weeklyWeekday) || 0, time: weeklyTime, timezone };
        break;
    }
    await onSubmit(payload, initial?.id);
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {/* Barra de ações fixa */}
      <div className="
        sticky top-2 z-10
        flex items-center justify-between
        rounded-xl border border-neutral-800 bg-neutral-900/70 backdrop-blur
        px-2 py-1
      ">
        <IconButton onClick={onCancel}><ChevronLeftIcon /></IconButton>
        <DefaultButton type="submit" disabled={submitting || !maySubmit || !canSubmitLocal()}>
          {submitting ? "Salvando..." : isEdit ? "Salvar" : "Criar"}
        </DefaultButton>
      </div>

      {/* GRID principal: esquerda (dados/agenda) | direita (SQL) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna esquerda */}
        <div className="lg:col-span-5 space-y-6">
          {/* Seção: Dados básicos */}
          <section className="rounded-2xl border border-neutral-800 p-4">
            <h3 className="mb-3 text-sm font-semibold text-neutral-200">Dados do script</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DefaultInput
                label="Nome"
                placeholder="Nome do script"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <DefaultInput
                label="search_path"
                placeholder="ex.: public,ext"
                value={searchPath}
                onChange={(e) => setSearchPath(e.target.value)}
              />
            </div>

            <DefaultInput
              label="Descrição (opcional)"
              placeholder="Opcional"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-4"
            />

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <DefaultCheckbox
                label="Habilitado"
                checked={enabled}
                onChange={(e) => setEnabled((e.target as HTMLInputElement).checked)}
              />
              <DefaultCheckbox
                label="Transação"
                checked={wrapInTransaction}
                onChange={(e) => setWrapInTransaction((e.target as HTMLInputElement).checked)}
              />
              <DefaultInput
                type="number"
                min={0}
                label="Timeout (s)"
                value={timeoutSec}
                onChange={(e) => setTimeoutSec(Number(e.target.value))}
              />
              <DefaultSelect
                label="Tipo de Agendamento"
                value={scheduleType}
                onChange={(e) => setScheduleType(e.target.value as ScheduleType)}
                options={[
                  { value: "CRON", label: "CRON" },
                  { value: "INTERVAL", label: "Intervalo" },
                  { value: "DAILY_AT", label: "Diário às" },
                  { value: "WEEKLY_AT", label: "Semanal às" },
                ]}
              />
            </div>
          </section>

          {/* Seção: Agendamento (dinâmico) */}
          <section className="rounded-2xl border border-neutral-800 p-4">
            <h3 className="mb-3 text-sm font-semibold text-neutral-200">Agendamento</h3>

            {scheduleType === "CRON" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DefaultInput
                  label="Expressão CRON (5 ou 6 campos)"
                  placeholder="0 0 * * * *"
                  value={cron}
                  onChange={(e) => setCron(e.target.value)}
                />
                <TimezoneSelect
                  label="Time zone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  preferred={["America/Sao_Paulo", "UTC"]}
                  showOffset
                  includeUTC
                />
              </div>
            )}

            {scheduleType === "INTERVAL" && (
              <DefaultInput
                type="number"
                min={1}
                label="A cada (segundos)"
                value={intervalSec}
                onChange={(e) => setIntervalSec(Number(e.target.value))}
              />
            )}

            {scheduleType === "DAILY_AT" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DefaultInput
                  type="time"
                  label="Horário (HH:mm)"
                  value={dailyTime}
                  onChange={(e) => setDailyTime(e.target.value)}
                />
                <TimezoneSelect
                  label="Time zone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  preferred={["America/Sao_Paulo", "UTC"]}
                  showOffset
                  includeUTC
                />
              </div>
            )}

            {scheduleType === "WEEKLY_AT" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <DefaultSelect
                  label="Dia da semana"
                  value={weeklyWeekday}
                  onChange={(e) => setWeeklyWeekday(Number(e.target.value))}
                  options={[
                    { value: 0, label: "Domingo" },
                    { value: 1, label: "Segunda" },
                    { value: 2, label: "Terça" },
                    { value: 3, label: "Quarta" },
                    { value: 4, label: "Quinta" },
                    { value: 5, label: "Sexta" },
                    { value: 6, label: "Sábado" },
                  ]}
                />
                <DefaultInput
                  type="time"
                  label="Horário (HH:mm)"
                  value={weeklyTime}
                  onChange={(e) => setWeeklyTime(e.target.value)}
                  className="sm:col-span-2"
                />
                <TimezoneSelect
                  label="Time zone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  preferred={["America/Sao_Paulo", "UTC"]}
                  showOffset
                  includeUTC
                  className="sm:col-span-3"
                />
              </div>
            )}
          </section>
        </div>

        {/* Coluna direita (SQL) */}
        <div className="lg:col-span-7">
          <section className="rounded-2xl border border-neutral-800 p-4 lg:sticky lg:top-16">
            <h3 className="mb-3 text-sm font-semibold text-neutral-200">SQL</h3>
            <DefaultTextarea
              placeholder="Escreva o SQL a ser executado..."
              value={sqlText}
              onChange={(e) => setSqlText(e.target.value)}
              className="min-h-[520px] font-mono"
            />
          </section>
        </div>
      </div>
    </form>
  );
}
