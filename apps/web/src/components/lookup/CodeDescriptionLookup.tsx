import SearchIcon from "@mui/icons-material/Search";
import React from "react";
import LookupSearchModal from "./LookupSearchModal";

export type CodeDescriptionOption = {
  code: number;
  description: string;
};

type CodeDescriptionLookupProps = {
  code: number | null;
  options: CodeDescriptionOption[];
  onCodeChange: (code: number | null) => void;
  onValidityChange?: (isValid: boolean) => void;
  disabled?: boolean;
  codePlaceholder?: string;
  descriptionPlaceholder?: string;
  invalidCodeMessage?: string;
  maxSuggestions?: number;
  modalTitle?: string;
  modalLabelHeader?: string;
};

const inputBaseClass = [
  "w-full border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm",
  "placeholder:text-neutral-400",
  "transition-colors duration-150",
  "focus:outline-none focus:ring-2 focus:ring-pilar-green/35 focus:border-pilar-green",
  "disabled:cursor-not-allowed disabled:opacity-60",
  "dark:border-neutral-600 dark:bg-pilar-default-bg-dark dark:text-neutral-100 dark:placeholder:text-neutral-500",
].join(" ");

export default function CodeDescriptionLookup({
  code,
  options,
  onCodeChange,
  onValidityChange,
  disabled = false,
  codePlaceholder = "Codigo",
  descriptionPlaceholder = "Descricao",
  invalidCodeMessage = "Codigo informado nao existe neste contexto.",
  maxSuggestions = 8,
  modalTitle = "Selecionar item",
  modalLabelHeader = "Descricao",
}: CodeDescriptionLookupProps) {
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const descriptionInputRef = React.useRef<HTMLInputElement | null>(null);

  const [descriptionQuery, setDescriptionQuery] = React.useState("");
  const [suggestionsOpen, setSuggestionsOpen] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalSearch, setModalSearch] = React.useState("");

  const selectedOption = React.useMemo(
    () => (code == null ? null : options.find((option) => option.code === code) ?? null),
    [code, options],
  );

  const hasLookupData = options.length > 0;
  const isCodeValid = code == null || !hasLookupData || selectedOption !== null;

  React.useEffect(() => {
    onValidityChange?.(isCodeValid);
  }, [isCodeValid, onValidityChange]);

  React.useEffect(() => {
    if (selectedOption) {
      setDescriptionQuery(selectedOption.description);
      return;
    }
    if (code == null) {
      setDescriptionQuery("");
    }
  }, [selectedOption, code]);

  React.useEffect(() => {
    if (!suggestionsOpen) return;
    const onDocumentMouseDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setSuggestionsOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocumentMouseDown);
    return () => document.removeEventListener("mousedown", onDocumentMouseDown);
  }, [suggestionsOpen]);

  const filteredOptions = React.useMemo(() => {
    const q = descriptionQuery.trim().toLowerCase();
    if (!q) {
      return options.slice(0, maxSuggestions);
    }
    return options
      .filter((option) =>
        `${option.code} ${option.description}`.toLowerCase().includes(q),
      )
      .slice(0, maxSuggestions);
  }, [descriptionQuery, maxSuggestions, options]);

  const modalFilteredOptions = React.useMemo(() => {
    const q = modalSearch.trim().toLowerCase();
    if (!q) {
      return options;
    }
    return options.filter((option) =>
      `${option.code} ${option.description}`.toLowerCase().includes(q),
    );
  }, [modalSearch, options]);

  const handleCodeInputChange = (rawValue: string) => {
    const clean = rawValue.replace(/\D/g, "");
    if (!clean) {
      onCodeChange(null);
      setDescriptionQuery("");
      setSuggestionsOpen(false);
      return;
    }

    const parsedCode = Number(clean);
    onCodeChange(parsedCode);

    const match = options.find((option) => option.code === parsedCode);
    if (match) {
      setDescriptionQuery(match.description);
      setSuggestionsOpen(false);
    } else {
      setDescriptionQuery("");
    }
  };

  const handleDescriptionInputChange = (nextValue: string) => {
    setDescriptionQuery(nextValue);
    if (code != null) {
      onCodeChange(null);
    }
    setSuggestionsOpen(true);
  };

  const selectOption = (option: CodeDescriptionOption) => {
    onCodeChange(option.code);
    setDescriptionQuery(option.description);
    setSuggestionsOpen(false);
  };

  const codeInputClass = [
    inputBaseClass,
    "rounded-l-md rounded-r-none pr-8",
    isCodeValid
      ? "border-neutral-300 dark:border-neutral-600"
      : "border-red-500 focus:border-red-500 focus:ring-red-200 dark:border-red-500 dark:focus:ring-red-500/20",
  ].join(" ");

  return (
    <div className="space-y-1" ref={wrapperRef}>
      <div className="flex">
        <div className="relative w-[140px] shrink-0">
          <input
            type="text"
            inputMode="numeric"
            className={codeInputClass}
            value={code ?? ""}
            onChange={(e) => handleCodeInputChange(e.target.value)}
            placeholder={codePlaceholder}
            disabled={disabled}
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-neutral-500 transition-colors hover:text-neutral-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-neutral-300 dark:hover:text-neutral-100"
            onClick={() => {
              if (disabled) return;
              setSuggestionsOpen(false);
              setModalSearch(descriptionQuery);
              setModalOpen(true);
            }}
            disabled={disabled}
            title="Pesquisar"
            aria-label="Pesquisar"
          >
            <SearchIcon fontSize="small" />
          </button>
        </div>

        <div className="relative min-w-0 flex-1">
          <input
            ref={descriptionInputRef}
            type="text"
            className={`${inputBaseClass} rounded-r-md rounded-l-none border-l-0`}
            value={descriptionQuery}
            onChange={(e) => handleDescriptionInputChange(e.target.value)}
            onFocus={() => setSuggestionsOpen(true)}
            placeholder={descriptionPlaceholder}
            disabled={disabled}
          />

          {suggestionsOpen && (
            <div className="absolute left-0 right-0 z-[80] mt-1 max-h-56 overflow-y-auto rounded-md border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400">
                  Nenhum resultado encontrado.
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    key={option.code}
                    type="button"
                    className="flex w-full cursor-pointer items-center gap-2 border-b border-neutral-100 px-3 py-2 text-left text-sm text-neutral-700 transition-colors last:border-b-0 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-800"
                    onClick={() => selectOption(option)}
                  >
                    <span className="w-16 shrink-0 font-medium text-neutral-500 dark:text-neutral-400">
                      {option.code}
                    </span>
                    <span className="min-w-0 truncate">{option.description}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {hasLookupData && !isCodeValid && (
        <p className="text-xs text-red-600 dark:text-red-400">{invalidCodeMessage}</p>
      )}

      <LookupSearchModal
        open={modalOpen}
        title={modalTitle}
        search={modalSearch}
        onSearchChange={setModalSearch}
        loading={false}
        rows={modalFilteredOptions.map((option) => ({
          id: option.code,
          label: option.description,
        }))}
        onSelect={(selectedCode) => {
          const selected = options.find((option) => option.code === selectedCode);
          if (!selected) return;
          onCodeChange(selected.code);
          setDescriptionQuery(selected.description);
          setSuggestionsOpen(false);
          setModalOpen(false);
        }}
        onClose={() => setModalOpen(false)}
        labelHeader={modalLabelHeader}
      />
    </div>
  );
}
