type Props = {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
};

export default function GroupTabs({ tabs, active, onChange }: Props) {
  if (tabs.length === 0) return null;

  return (
    <div className="overflow-x-auto pb-1">
      <nav
        className="inline-flex min-w-full gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-1 dark:border-white/10 dark:bg-pilar-default-bg-dark/40"
        aria-label="Tabs de grupos"
      >
        {tabs.map((t) => {
          const isActive = active === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => onChange(t)}
              className={`whitespace-nowrap rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "border-emerald-200 bg-white text-emerald-700 shadow-sm dark:border-emerald-500/35 dark:bg-pilar-default-bg2-dark dark:text-emerald-200"
                  : "border-transparent text-neutral-600 hover:bg-white/70 hover:text-neutral-800 dark:text-neutral-300 dark:hover:bg-white/10 dark:hover:text-neutral-100"
              }`}
            >
              {t === "sem_grupo" ? "Sem grupo" : t}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
