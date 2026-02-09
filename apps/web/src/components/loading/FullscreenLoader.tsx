import { useEffect } from "react";
import loadingGif from "./loading.gif"; // ajuste o path conforme onde você salvar o gif

type Props = {
  open: boolean;
  label?: string;
  backdropClassName?: string; // opcional para customizar o escurecimento
};

export default function FullscreenLoader({
  open,
  label = "Carregando...",
  backdropClassName = "bg-black/40", // leve escurecimento
}: Props) {
  // Evita scroll da página enquanto o loader estiver aberto
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      {/* Backdrop */}
      <div className={`absolute inset-0 ${backdropClassName}`} />

      {/* Conteúdo central */}
      <div className="relative z-10 flex flex-col items-center gap-3 p-4">
        <img src={loadingGif} alt="" className="h-12 w-12" />
        <span className="text-sm text-white drop-shadow">{label}</span>
      </div>
    </div>
  );
}
