// src/pages/configuracoes/db-scripts/components/DbScriptForm.tsx
import React from "react";
import { IconButton } from "../../../../components/crud/primitives";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function DbScriptForm({ initial, onCancel, onSubmit, submitting, isEdit, maySubmit }: any) {
  const [name, setName] = React.useState(initial?.name ?? "");
  const [description, setDescription] = React.useState(initial?.description ?? "");
  const [sqlText, setSqlText] = React.useState(initial?.sqlText ?? "");
  const [wrapInTransaction, setWrapInTransaction] = React.useState(Boolean(initial?.wrapInTransaction));
  const [searchPath, setSearchPath] = React.useState(initial?.searchPath ?? "");
  const [timeoutSec, setTimeoutSec] = React.useState<number>(initial?.timeoutSec ?? 600);
  const [enabled, setEnabled] = React.useState<boolean>(initial?.enabled ?? true);

  type ScheduleType = 'CRON' | 'INTERVAL' | 'DAILY_AT' | 'WEEKLY_AT';
  const [scheduleType, setScheduleType] = React.useState<ScheduleType>(initial?.scheduleType ?? 'CRON');
  const [cron, setCron] = React.useState(initial?.cronExpression ?? "0 0 * * * *");
  const [intervalSec, setIntervalSec] = React.useState<number>(initial?.intervalSeconds ?? 3600);
  const [dailyTime, setDailyTime] = React.useState(initial?.dailyTime ?? "09:00");
  const [weeklyWeekday, setWeeklyWeekday] = React.useState<number>(initial?.weeklyWeekday ?? 1);
  const [weeklyTime, setWeeklyTime] = React.useState(initial?.weeklyTime ?? "09:00");
  const [timezone, setTimezone] = React.useState(initial?.timezone ?? "America/Sao_Paulo");

  const canSubmitLocal = () => {
    if (!name.trim() || !sqlText.trim()) return false;
    switch (scheduleType) {
      case 'CRON': return Boolean(cron.trim());
      case 'INTERVAL': return Number(intervalSec) > 0;
      case 'DAILY_AT': return Boolean(dailyTime.trim());
      case 'WEEKLY_AT': return Number(weeklyWeekday) >= 0 && Boolean(weeklyTime.trim());
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmitLocal() || !maySubmit) return;

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
      case "CRON": payload.cron = { cron, timezone }; break;
      case "INTERVAL": payload.interval = { everySeconds: Number(intervalSec) || 0 }; break;
      case "DAILY_AT": payload.dailyAt = { time: dailyTime, timezone }; break;
      case "WEEKLY_AT": payload.weeklyAt = { weekday: Number(weeklyWeekday)||0, time: weeklyTime, timezone }; break;
    }
    // Quando editando, GridForm chamará updateItem com id do selecionado
    await onSubmit(payload, initial?.id);
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="flex items-center justify-between">
        <IconButton onClick={onCancel}><ChevronLeftIcon/></IconButton>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting || !maySubmit || !canSubmitLocal()}
            className="rounded-xl bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          >
            {submitting ? "Salvando..." : isEdit ? "Salvar" : "Criar"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block">
          <span className="mb-1 block text-sm text-neutral-300">Nome</span>
          <input className="w-full rounded-xl border border-neutral-700 bg-neutral-900 p-3 outline-none focus:ring-2"
                 value={name} onChange={(e)=>setName(e.target.value)} placeholder="Nome do script" />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-neutral-300">search_path</span>
          <input className="w-full rounded-xl border border-neutral-700 bg-neutral-900 p-3"
                 value={searchPath} onChange={(e)=>setSearchPath(e.target.value)} placeholder="ex.: public,ext" />
        </label>

        <label className="block md:col-span-2">
          <span className="mb-1 block text-sm text-neutral-300">Descrição (opcional)</span>
          <input className="w-full rounded-xl border border-neutral-700 bg-neutral-900 p-3"
                 value={description} onChange={(e)=>setDescription(e.target.value)} placeholder="Opcional" />
        </label>

        <label className="block md:col-span-2">
          <span className="mb-1 block text-sm text-neutral-300">SQL</span>
          <textarea className="w-full h-56 rounded-xl border border-neutral-700 bg-neutral-900 p-3 font-mono text-sm outline-none focus:ring-2"
                    value={sqlText} onChange={(e)=>setSqlText(e.target.value)} placeholder="Escreva o SQL a ser executado..." />
        </label>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:col-span-2">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)} />
            <span>Habilitado</span>
          </label>

          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={wrapInTransaction} onChange={e=>setWrapInTransaction(e.target.checked)} />
            <span>Transação</span>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-neutral-300">Timeout (s)</span>
            <input type="number" min={0} className="w-full rounded-xl border border-neutral-700 bg-neutral-900 p-2"
                   value={timeoutSec} onChange={(e)=>setTimeoutSec(Number(e.target.value))} />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-neutral-300">Tipo de Agendamento</span>
            <select className="w-full rounded-xl border border-neutral-700 bg-neutral-900 p-3"
                    value={scheduleType} onChange={(e)=>setScheduleType(e.target.value as ScheduleType)}>
              <option value="CRON">CRON</option>
              <option value="INTERVAL">Intervalo</option>
              <option value="DAILY_AT">Diário às</option>
              <option value="WEEKLY_AT">Semanal às</option>
            </select>
          </label>
        </div>

        {scheduleType === "CRON" && (
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1 block text-sm text-neutral-300">Expressão CRON (5 ou 6 campos)</span>
              <input className="w-full rounded-xl border border-neutral-700 bg-neutral-900 p-3"
                     value={cron} onChange={(e)=>setCron(e.target.value)} placeholder="0 0 * * * *" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-neutral-300">Time zone</span>
              <input className="w-full rounded-xl border border-neutral-700 bg-neutral-900 p-3"
                     value={timezone} onChange={(e)=>setTimezone(e.target.value)} placeholder="America/Sao_Paulo" />
            </label>
          </div>
        )}

        {scheduleType === "INTERVAL" && (
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm text-neutral-300">A cada (segundos)</span>
            <input type="number" min={1} className="w-full rounded-xl border border-neutral-700 bg-neutral-900 p-3"
                   value={intervalSec} onChange={(e)=>setIntervalSec(Number(e.target.value))} />
          </label>
        )}

        {scheduleType === "DAILY_AT" && (
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1 block text-sm text-neutral-300">Horário (HH:mm)</span>
              <input className="w-full rounded-xl border border-neutral-700 bg-neutral-900 p-3"
                     value={dailyTime} onChange={(e)=>setDailyTime(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-neutral-300">Time zone</span>
              <input className="w-full rounded-xl border border-neutral-700 bg-neutral-900 p-3"
                     value={timezone} onChange={(e)=>setTimezone(e.target.value)} placeholder="America/Sao_Paulo" />
            </label>
          </div>
        )}

        {scheduleType === "WEEKLY_AT" && (
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="block">
              <span className="mb-1 block text-sm text-neutral-300">Dia da semana</span>
              <select className="w-full rounded-xl border border-neutral-700 bg-neutral-900 p-3"
                      value={weeklyWeekday} onChange={(e)=>setWeeklyWeekday(Number(e.target.value))}>
                <option value={0}>Domingo</option>
                <option value={1}>Segunda</option>
                <option value={2}>Terça</option>
                <option value={3}>Quarta</option>
                <option value={4}>Quinta</option>
                <option value={5}>Sexta</option>
                <option value={6}>Sábado</option>
              </select>
            </label>
            <label className="block col-span-2">
              <span className="mb-1 block text-sm text-neutral-300">Horário (HH:mm)</span>
              <input className="w-full rounded-xl border border-neutral-700 bg-neutral-900 p-3"
                     value={weeklyTime} onChange={(e)=>setWeeklyTime(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-neutral-300">Time zone</span>
              <input className="w-full rounded-xl border border-neutral-700 bg-neutral-900 p-3"
                     value={timezone} onChange={(e)=>setTimezone(e.target.value)} placeholder="America/Sao_Paulo" />
            </label>
          </div>
        )}
      </div>
    </form>
  );
}
