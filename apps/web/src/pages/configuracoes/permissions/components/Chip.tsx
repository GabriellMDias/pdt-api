type Props = {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
};

export default function Chip({ label, selected, onClick, disabled }: Props) {
  const selectedClass =
    "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200 dark:hover:bg-emerald-500/20";
  const idleClass =
    "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50 dark:border-white/15 dark:bg-transparent dark:text-neutral-200 dark:hover:border-white/25 dark:hover:bg-white/5";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
        selected ? selectedClass : idleClass
      } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
    >
      {label}
    </button>
  );
}
