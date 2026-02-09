// src/components/inputs/MultiSelect.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';

export type Option = { value: string | number; label: string; disabled?: boolean };

type Props = {
  options: Option[];
  value: Array<string | number>;
  onChange: (values: Array<string | number>) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  searchable?: boolean;         // exibe input para busca
  showSelectAll?: boolean;      // exibe "Selecionar todas"
  clearable?: boolean;          // exibe botão de limpar
  maxMenuHeight?: number;       // px
};

export default function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Selecione...',
  className,
  disabled,
  searchable = true,
  showSelectAll = true,
  clearable = true,
  maxMenuHeight = 240,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedSet = useMemo(() => new Set(value.map(String)), [value]);
  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const allEnabledValues = useMemo(
    () => options.filter((o) => !o.disabled).map((o) => String(o.value)),
    [options]
  );

  const allSelected = useMemo(() => {
    if (!allEnabledValues.length) return false;
    return allEnabledValues.every((v) => selectedSet.has(v));
  }, [allEnabledValues, selectedSet]);

  function toggle(valueToToggle: string | number) {
    const s = new Set(selectedSet);
    const key = String(valueToToggle);
    if (s.has(key)) s.delete(key);
    else s.add(key);
    onChange(Array.from(s));
  }

  function selectAll() {
    onChange(allEnabledValues);
  }

  function clearAll() {
    onChange([]);
  }

  // outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // keyboard handlers
  function onButtonKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(true);
      setActiveIndex(0);
    }
  }

  function onMenuKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (filtered[activeIndex]) toggle(filtered[activeIndex].value);
    }
  }

  // label do botão
  const buttonLabel = useMemo(() => {
    if (!value.length) return placeholder;
    if (value.length === 1) {
      const one = options.find((o) => String(o.value) === String(value[0]));
      return one?.label ?? placeholder;
    }
    return `${value.length} selecionadas`;
  }, [value, options, placeholder]);

  return (
    <div ref={containerRef} className={clsx('relative', className)}>
      <button
        type="button"
        className={clsx(
          'w-full inline-flex items-center justify-between rounded-xl px-3 py-2',
          'border border-neutral-300 dark:border-neutral-600',
          'bg-white dark:bg-pilar-default-bg-dark text-sm',
          'focus:outline-none focus:ring-2 focus:ring-pilar-green cursor-pointer',
          disabled && 'opacity-60 cursor-not-allowed'
        )}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onButtonKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        title={Array.isArray(value) && value.length ? value.join(', ') : undefined}
      >
        <span className="truncate">{buttonLabel}</span>
        <svg width="18" height="18" viewBox="0 0 20 20" className="ml-2 opacity-80">
          <path
            d="M6 8l4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          className={clsx(
            'absolute z-20 mt-2 w-full rounded-xl shadow-lg',
            'bg-white dark:bg-pilar-default-bg-dark',
            'border border-neutral-200 dark:border-neutral-700'
          )}
          onKeyDown={onMenuKeyDown}
          role="listbox"
          tabIndex={-1}
        >
          {/* header com select-all & clear */}
          <div className="flex items-center justify-between px-2 py-2 border-b border-neutral-200 dark:border-neutral-700">
            {showSelectAll ? (
              <button
                type="button"
                className="flex items-center gap-2 text-sm px-2 py-1 rounded hover:bg-pilar-default-bg-light/60 dark:hover:bg-neutral-700/50 cursor-pointer"
                onClick={() => (allSelected ? clearAll() : selectAll())}
              >
                <span
                  className={clsx(
                    'h-4 w-4 rounded border',
                    allSelected
                      ? 'bg-pilar-green border-pilar-green'
                      : 'bg-transparent border-neutral-400'
                  )}
                />
                {allSelected ? 'Desmarcar todas' : 'Selecionar todas'}
              </button>
            ) : <div />}

            {clearable && (
              <button
                type="button"
                className="p-1 rounded hover:bg-pilar-default-bg-light/60 dark:hover:bg-neutral-700/50"
                title="Limpar seleção"
                onClick={clearAll}
              >
                <svg width="16" height="16" viewBox="0 0 20 20">
                  <path
                    d="M6 6l8 8M14 6l-8 8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* busca */}
          {searchable && (
            <div className="px-2 pt-2">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar..."
                className={clsx(
                  'w-full mb-2 rounded-lg px-3 py-2 text-sm',
                  'border border-neutral-300 dark:border-neutral-600',
                  'bg-white dark:bg-pilar-default-bg2-dark'
                )}
              />
            </div>
          )}

          {/* lista */}
          <div
            style={{ maxHeight: maxMenuHeight }}
            className="overflow-auto py-1"
          >
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-sm text-neutral-500">Sem opções</div>
            )}
            {filtered.map((opt, idx) => {
              const checked = selectedSet.has(String(opt.value));
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  disabled={opt.disabled}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => toggle(opt.value)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-3 py-2 text-left text-sm',
                    'hover:bg-pilar-default-bg-light/60 dark:hover:bg-neutral-700/50 cursor-pointer',
                    activeIndex === idx && 'bg-pilar-default-bg-light/60 dark:bg-neutral-700/40',
                    opt.disabled && 'opacity-50 cursor-not-allowed'
                  )}
                  role="option"
                  aria-selected={checked}
                >
                  <span
                    className={clsx(
                      'h-4 w-4 rounded border flex items-center justify-center',
                      checked
                        ? 'bg-pilar-green border-pilar-green text-white'
                        : 'bg-transparent border-neutral-400'
                    )}
                  >
                    {checked && (
                      <svg width="12" height="12" viewBox="0 0 20 20">
                        <path
                          d="M5 10l3 3 7-7"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    )}
                  </span>
                  <span className="truncate">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
