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
  const bg =
    tone === "primary" ? "var(--color-pilar-green)"
    : tone === "danger" ? "var(--color-pilar-orange)"
    : "var(--color-pilar-default-bg2-dark)";
  const border = tone === "neutral" ? "1px solid rgba(255,255,255,0.10)" : "0";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        background: bg,
        color: "#fff",
        padding: "8px 12px",
        border: border as any,
        borderRadius: 10,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1
      }}
    >
      <span style={{ display: "grid", placeItems: "center" }}>{icon}</span>
      <span style={{ fontWeight: 600 }}>{label}</span>
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