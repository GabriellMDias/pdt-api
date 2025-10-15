type Props = {
  tabs: string[];            // ex.: ['sankhya_api', 'email', 'sem_grupo']
  active: string;
  onChange: (tab: string) => void;
};

export default function GroupTabs({ tabs, active, onChange }: Props) {
  if (tabs.length === 0) return null;
  return (
    <div className="border-b mb-4">
      <nav className="-mb-px flex gap-2" aria-label="Tabs">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => onChange(t)}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
              active === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 cursor-pointer'
            }`}
          >
            {t === 'sem_grupo' ? 'Sem grupo' : t}
          </button>
        ))}
      </nav>
    </div>
  );
}