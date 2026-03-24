import type { ReactNode } from "react";
import CloseIcon from "@mui/icons-material/Close";
import type { MobileTransmissionLog } from "./types";

type Props = {
  open: boolean;
  item: MobileTransmissionLog | null;
  onClose: () => void;
};

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("pt-BR");
}

function formatJson(value: unknown) {
  if (value == null) return "-";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="grid gap-1 md:grid-cols-[170px_1fr]">
      <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {label}
      </span>
      <div className="text-sm text-neutral-800 dark:text-neutral-100">{value}</div>
    </div>
  );
}

export default function TransmissionLogDetailsModal({
  open,
  item,
  onClose,
}: Props) {
  if (!open || !item) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-neutral-900/45 px-4 backdrop-blur-sm dark:bg-black/65"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      aria-modal="true"
      role="dialog"
    >
      <div className="w-full max-w-5xl rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-pilar-default-bg-dark">
        <div className="flex items-center justify-between gap-3 border-b border-neutral-200 p-4 dark:border-white/10">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-neutral-800 dark:text-neutral-100">
              {item.routineLabel} • {item.statusLabel}
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {item.summary}
            </p>
          </div>

          <button
            type="button"
            className="cursor-pointer rounded-md p-1 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-300 dark:hover:bg-white/10 dark:hover:text-neutral-100"
            onClick={onClose}
            aria-label="Fechar"
          >
            <CloseIcon fontSize="small" />
          </button>
        </div>

        <div className="max-h-[80vh] space-y-5 overflow-y-auto p-4">
          <section className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-white/10 dark:bg-white/5">
            <div className="grid gap-3">
              <DetailRow label="Data/Hora" value={formatDateTime(item.createdAt)} />
              <DetailRow
                label="Usuario"
                value={
                  <div>
                    <div>{item.userName ?? `Usuario #${item.userId}`}</div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      {item.userEmail ?? "-"}
                    </div>
                  </div>
                }
              />
              <DetailRow label="Loja" value={item.storeLabel ?? "-"} />
              <DetailRow label="Tipo" value={item.routineLabel} />
              <DetailRow label="Resultado" value={item.result} />
              <DetailRow label="Duracao" value={item.durationMs != null ? `${item.durationMs} ms` : "-"} />
              <DetailRow label="Receipt ID" value={<span className="font-mono text-xs">{item.receiptId}</span>} />
              <DetailRow label="Event ID" value={<span className="font-mono text-xs">{item.eventId}</span>} />
              <DetailRow label="Referencia" value={<span className="font-mono text-xs">{item.aggregateKey ?? "-"}</span>} />
              <DetailRow label="Processado em" value={formatDateTime(item.processedAt)} />
              <DetailRow label="Atualizado em" value={formatDateTime(item.updatedAt)} />
              <DetailRow label="Device ID" value={<span className="font-mono text-xs">{item.deviceId ?? "-"}</span>} />
              <DetailRow label="Erro codigo" value={item.errorCode ?? "-"} />
              <DetailRow label="Erro mensagem" value={item.errorMessage ?? "-"} />
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-white/10 dark:bg-white/5">
              <h3 className="mb-3 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                Payload enviado
              </h3>
              <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-neutral-950 p-3 text-xs text-neutral-100">
                {formatJson(item.requestPayload)}
              </pre>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-white/10 dark:bg-white/5">
              <h3 className="mb-3 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                Resposta / metadados
              </h3>
              <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-neutral-950 p-3 text-xs text-neutral-100">
                {formatJson(item.responsePayload)}
              </pre>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
