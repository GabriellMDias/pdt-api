type Props = {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
};

export default function Chip({ label, selected, onClick, disabled }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "6px 10px",
        borderRadius: 999,
        border: selected ? "1px solid var(--color-pilar-green)" : "1px solid rgba(255,255,255,0.15)",
        background: selected ? "rgba(0,85,59,0.18)" : "transparent",
        color: selected ? "var(--color-pilar-default-bg-light)" : "#e5e7eb",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        fontSize: 13,
      }}
    >
      {label}
    </button>
  );
}