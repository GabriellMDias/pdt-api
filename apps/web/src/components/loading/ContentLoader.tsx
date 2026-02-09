import loadingGif from "./loading.gif";

type Props = {
  open: boolean;
  label?: string;
};

export default function ContentLoader({ open, label = "Carregando..." }: Props) {
  if (!open) return null;

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/30"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3">
        <img src={loadingGif} alt="" className="h-12 w-12" />
        <span className="text-sm text-white">{label}</span>
      </div>
    </div>
  );
}
