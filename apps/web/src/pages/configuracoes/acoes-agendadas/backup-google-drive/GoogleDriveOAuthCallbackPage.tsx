import React from "react";

const OAUTH_CALLBACK_MSG = "gdrive_backup_oauth_callback";

export default function GoogleDriveOAuthCallbackPage() {
  const [message, setMessage] = React.useState(
    "Concluindo autenticacao do Google...",
  );

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payload = {
      type: OAUTH_CALLBACK_MSG,
      code: params.get("code") ?? undefined,
      error: params.get("error") ?? undefined,
      state: params.get("state") ?? undefined,
      errorDescription: params.get("error_description")
        ? decodeURIComponent(params.get("error_description") as string)
        : undefined,
    };

    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(payload, window.location.origin);
      setMessage("Autenticacao recebida. Esta janela pode ser fechada.");
      window.close();
      return;
    }

    setMessage(
      "Nao foi possivel comunicar com a janela principal. Feche esta janela e tente novamente.",
    );
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 p-6">
      <div className="max-w-md rounded-xl border border-neutral-800 bg-neutral-900 p-5 text-sm text-neutral-200">
        {message}
      </div>
    </div>
  );
}
