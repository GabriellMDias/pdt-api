import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { fieldMenuSurfaceClass } from "./inputs/styles";

type InfoHintPlacement =
  | "bottom-start"
  | "bottom-end"
  | "top-start"
  | "top-end";

type InfoHintProps = {
  content: ReactNode;
  title?: ReactNode;
  placement?: InfoHintPlacement;
  ariaLabel?: string;
  className?: string;
  iconClassName?: string;
  panelClassName?: string;
};

const PLACEMENT_CLASSNAMES: Record<InfoHintPlacement, string> = {
  "bottom-start": "left-0 top-full mt-2",
  "bottom-end": "right-0 top-full mt-2",
  "top-start": "left-0 bottom-full mb-2",
  "top-end": "right-0 bottom-full mb-2",
};

export default function InfoHint({
  content,
  title,
  placement = "bottom-start",
  ariaLabel = "Abrir informacoes",
  className,
  iconClassName,
  panelClassName,
}: InfoHintProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleDocumentClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleDocumentClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={`relative inline-flex ${className || ""}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        className={[
          "inline-flex h-7 w-7 items-center justify-center rounded-full border border-neutral-300 bg-white/90 text-neutral-600 transition-colors",
          "hover:border-neutral-400 hover:bg-neutral-100 hover:text-neutral-900",
          "focus:outline-none focus:ring-2 focus:ring-pilar-green/30",
          "dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
          "dark:hover:border-neutral-500 dark:hover:bg-neutral-700 dark:hover:text-neutral-100",
          iconClassName || "",
        ].join(" ")}
        aria-label={ariaLabel}
        aria-describedby={open ? panelId : undefined}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <InfoOutlinedIcon sx={{ fontSize: 16 }} />
      </button>

      {open && (
        <div
          id={panelId}
          role="tooltip"
          className={[
            fieldMenuSurfaceClass,
            "absolute z-30 w-80 max-w-[calc(100vw-2rem)] border-neutral-300 bg-white/98 p-3 text-left shadow-xl shadow-neutral-300/50",
            "dark:border-neutral-700 dark:bg-pilar-default-bg-dark dark:shadow-black/30",
            PLACEMENT_CLASSNAMES[placement],
            panelClassName || "",
          ].join(" ")}
          onMouseDown={(event) => event.preventDefault()}
        >
          {title ? (
            <div className="mb-2 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
              {title}
            </div>
          ) : null}
          <div className="space-y-2 text-xs leading-5 text-neutral-700 dark:text-neutral-300">
            {content}
          </div>
        </div>
      )}
    </div>
  );
}
