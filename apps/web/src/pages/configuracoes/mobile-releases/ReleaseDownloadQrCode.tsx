import QRCode from "react-qr-code";

type ReleaseDownloadQrCodeProps = {
  url: string;
  versionName: string;
  buildNumber: number;
};

export default function ReleaseDownloadQrCode({
  url,
  versionName,
  buildNumber,
}: ReleaseDownloadQrCodeProps) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white/80 p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/40">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-700">
          <QRCode
            bgColor="#ffffff"
            fgColor="#111827"
            size={164}
            value={url}
            viewBox="0 0 256 256"
          />
        </div>

        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            QR Code da release atual
          </p>
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
            Escaneie para baixar no celular
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            v{versionName} • build {buildNumber}
          </p>
        </div>

        <a
          className="text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-300"
          href={url}
          rel="noreferrer"
          target="_blank"
        >
          Abrir link publico
        </a>
      </div>
    </div>
  );
}
