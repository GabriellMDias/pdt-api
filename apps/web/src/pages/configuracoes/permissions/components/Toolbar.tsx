import React from "react";
import SaveIcon from "@mui/icons-material/Save";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SyncIcon from "@mui/icons-material/Sync";

function ToolbarButton({
  icon, label, onClick,
  tone = "neutral" as "neutral"|"primary"|"danger",
  disabled
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  tone?: "neutral"|"primary"|"danger";
  disabled?: boolean;
}) {
  const toneClass =
    tone === "primary"
      ? "border border-transparent bg-pilar-green text-white hover:bg-[#006b4a] dark:hover:bg-[#0b7a56]"
      : tone === "danger"
        ? "border border-transparent bg-pilar-orange text-white hover:brightness-110"
        : "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 dark:border-white/15 dark:bg-pilar-default-bg-dark dark:text-neutral-200 dark:hover:bg-white/10";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      } ${toneClass}`}
    >
      <span className="grid place-items-center">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

type Props = {
  canSave: boolean;
  saving: boolean;
  onSave: () => void;
  onReset: () => void;
  onReload: () => void;
  hasChanges: boolean;
};

export default function Toolbar({
  canSave, saving, onSave, onReset, onReload, hasChanges
}: Props) {
  return (
    <>
      <ToolbarButton icon={<SyncIcon />} label="Recarregar" onClick={onReload} />
      <ToolbarButton icon={<RestartAltIcon />} label="Descartar" onClick={onReset} disabled={!hasChanges} />
      <ToolbarButton icon={<SaveIcon />} label={saving ? "Salvando..." : "Salvar"} onClick={onSave} tone="primary" disabled={!canSave} />
    </>
  );
}
