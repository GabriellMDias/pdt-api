import React from "react";
import CloseIcon from "@mui/icons-material/Close";
import { toast } from "react-toastify";
import Layout from "../../../../components/Layout";
import PermissionGate from "../../../../components/PermissionGate";
import Tag from "../../../../components/Tag";
import DefaultButton from "../../../../components/inputs/DefaultButton";
import DefaultInput from "../../../../components/inputs/DefaultInput";
import { useAuth } from "../../../../hooks/useAuth";
import {
  hasPermission,
  type PermissionBag,
} from "../../../../services/permission";
import { jobsApi } from "../jobs/api";
import type {
  GoogleDriveBackupConfig,
  GoogleDriveBackupFile,
  GoogleDriveFolder,
} from "../jobs/types";

const OAUTH_STATE_KEY = "gdrive_backup_oauth_state";
const OAUTH_CALLBACK_MSG = "gdrive_backup_oauth_callback";
const OAUTH_POPUP_NAME = "gdrive-backup-oauth";

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function statusClass(active: boolean) {
  return active
    ? "border-emerald-400 text-emerald-700"
    : "border-amber-400 text-amber-700";
}

function canBrowseFolders(config: GoogleDriveBackupConfig | null): boolean {
  return !!(
    config?.hasClientId &&
    config?.hasClientSecret &&
    config?.hasRefreshToken
  );
}

function getOAuthRedirectUri() {
  return `${window.location.origin}/oauth/google-drive/callback`;
}

type ModalShellProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidthClass?: string;
  zIndexClass?: string;
};

function ModalShell({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidthClass = "max-w-5xl",
  zIndexClass = "z-[60]",
}: ModalShellProps) {
  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 ${zIndexClass} flex items-center justify-center bg-neutral-900/45 backdrop-blur-sm px-4 dark:bg-black/60`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-modal="true"
      role="dialog"
    >
      <div
        className={`w-full ${maxWidthClass} rounded-xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-pilar-default-bg-dark`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-neutral-200 p-4 dark:border-white/10">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-neutral-800 dark:text-white">{title}</h2>
            {subtitle ? (
              <p className="mt-1 text-xs text-neutral-500 dark:text-white/70">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="text-neutral-500 transition-colors hover:text-neutral-700 dark:text-white/70 dark:hover:text-white"
            onClick={onClose}
            aria-label="Fechar"
          >
            <CloseIcon fontSize="small" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-4">{children}</div>

        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-neutral-200 p-4 dark:border-white/10">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR");
}

function formatBytes(value?: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return "-";
  }
  if (value === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let unitIdx = 0;

  while (size >= 1024 && unitIdx < units.length - 1) {
    size /= 1024;
    unitIdx += 1;
  }

  const decimals = unitIdx === 0 ? 0 : 1;
  return `${size.toFixed(decimals)} ${units[unitIdx]}`;
}

export default function BackupGoogleDrivePage() {
  const { token, permissions, userId } = useAuth();
  const perms = React.useMemo(
    () => (permissions ?? []) as PermissionBag,
    [permissions],
  );
  const isAdmin = userId === 0;

  const canView =
    isAdmin ||
    hasPermission(perms, "codeJobs:consultar") ||
    hasPermission(perms, "dbScripts:consultar");
  const canEdit =
    isAdmin ||
    hasPermission(perms, "codeJobs:editar") ||
    hasPermission(perms, "dbScripts:editar");
  const canExecute = isAdmin || hasPermission(perms, "codeJobs:executar");

  const [loadingConfig, setLoadingConfig] = React.useState(true);
  const [savingConfig, setSavingConfig] = React.useState(false);
  const [authorizing, setAuthorizing] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [config, setConfig] = React.useState<GoogleDriveBackupConfig | null>(
    null,
  );

  const [clientId, setClientId] = React.useState("");
  const [clientSecret, setClientSecret] = React.useState("");
  const [refreshToken, setRefreshToken] = React.useState("");
  const redirectUri = React.useMemo(() => getOAuthRedirectUri(), []);
  const oauthPopupRef = React.useRef<Window | null>(null);
  const oauthPopupWatchRef = React.useRef<number | null>(null);

  const [selectedFolder, setSelectedFolder] =
    React.useState<GoogleDriveFolder | null>(null);
  const [folderModalOpen, setFolderModalOpen] = React.useState(false);
  const [folderCandidate, setFolderCandidate] =
    React.useState<GoogleDriveFolder | null>(null);
  const [trail, setTrail] = React.useState<GoogleDriveFolder[]>([]);
  const [folders, setFolders] = React.useState<GoogleDriveFolder[]>([]);
  const [loadingFolders, setLoadingFolders] = React.useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = React.useState(false);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = React.useState(false);
  const [restoreCandidate, setRestoreCandidate] =
    React.useState<GoogleDriveBackupFile | null>(null);
  const [backupFiles, setBackupFiles] = React.useState<GoogleDriveBackupFile[]>(
    [],
  );
  const [loadingBackups, setLoadingBackups] = React.useState(false);
  const [restoringBackupId, setRestoringBackupId] = React.useState<
    string | null
  >(null);
  const hasPendingFolderSelection =
    !!selectedFolder?.id && selectedFolder.id !== config?.folderId;
  const canUseDriveApi = canBrowseFolders(config);

  const currentParentId = trail.length ? trail[trail.length - 1].id : undefined;
  const activeFolderId = folderCandidate?.id ?? selectedFolder?.id;

  const stripOAuthQueryParams = React.useCallback(() => {
    const url = new URL(window.location.href);
    [
      "code",
      "scope",
      "state",
      "error",
      "error_description",
      "prompt",
      "authuser",
    ].forEach((p) => url.searchParams.delete(p));
    const nextSearch = url.searchParams.toString();
    const next = `${url.pathname}${nextSearch ? `?${nextSearch}` : ""}${url.hash}`;
    window.history.replaceState({}, document.title, next);
  }, []);

  const loadConfig = React.useCallback(async () => {
    if (!canView) return;
    setLoadingConfig(true);
    try {
      const res = await jobsApi.getGoogleDriveBackupConfig(token);
      setConfig(res);

      if (res.folderId) {
        try {
          const details = await jobsApi.getGoogleDriveFolderDetails(
            res.folderId,
            token,
          );
          setSelectedFolder(details);
        } catch {
          setSelectedFolder({
            id: res.folderId,
            name: `(ID) ${res.folderId}`,
            parents: [],
          });
        }
      } else {
        setSelectedFolder(null);
      }
    } catch (error: unknown) {
      toast.error(
        `Falha ao carregar configuracao de backup: ${toErrorMessage(error)}`,
      );
    } finally {
      setLoadingConfig(false);
    }
  }, [token, canView]);

  const loadFolders = React.useCallback(async () => {
    if (!folderModalOpen || !canView || !canUseDriveApi) {
      setFolders([]);
      return;
    }

    setLoadingFolders(true);
    try {
      const res = await jobsApi.listGoogleDriveFolders(
        token,
        currentParentId,
        undefined,
        200,
      );
      setFolders(res.items);
    } catch (error: unknown) {
      toast.error(
        `Falha ao listar pastas do Google Drive: ${toErrorMessage(error)}`,
      );
    } finally {
      setLoadingFolders(false);
    }
  }, [token, canView, canUseDriveApi, currentParentId, folderModalOpen]);

  const loadBackupFiles = React.useCallback(async () => {
    if (!restoreModalOpen || !canView || !canUseDriveApi || !config?.folderId) {
      setBackupFiles([]);
      return;
    }

    setLoadingBackups(true);
    try {
      const res = await jobsApi.listGoogleDriveBackupFiles(
        token,
        undefined,
        100,
      );
      setBackupFiles(res.items);
    } catch (error: unknown) {
      toast.error(
        `Falha ao listar backups no Google Drive: ${toErrorMessage(error)}`,
      );
    } finally {
      setLoadingBackups(false);
    }
  }, [token, canView, canUseDriveApi, config?.folderId, restoreModalOpen]);

  React.useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  React.useEffect(() => {
    if (!folderModalOpen) return;
    void loadFolders();
  }, [folderModalOpen, currentParentId, loadFolders]);

  React.useEffect(() => {
    if (!restoreModalOpen) return;
    void loadBackupFiles();
  }, [restoreModalOpen, loadBackupFiles]);

  const handleOAuthCallback = React.useCallback(
    async (input: {
      code?: string | null;
      error?: string | null;
      state?: string | null;
      errorDescription?: string | null;
    }) => {
      if (!canEdit) return;

      const expectedState = sessionStorage.getItem(OAUTH_STATE_KEY);
      const returnedState = input.state ?? null;

      if (input.error) {
        toast.error(
          `Autorizacao Google nao concluida: ${input.errorDescription ?? input.error}`,
        );
        sessionStorage.removeItem(OAUTH_STATE_KEY);
        setAuthorizing(false);
        return;
      }

      if (!input.code) {
        toast.error("Retorno OAuth invalido: code ausente.");
        sessionStorage.removeItem(OAUTH_STATE_KEY);
        setAuthorizing(false);
        return;
      }

      if (expectedState && expectedState !== returnedState) {
        toast.error("Retorno OAuth invalido (state divergente).");
        sessionStorage.removeItem(OAUTH_STATE_KEY);
        setAuthorizing(false);
        return;
      }

      setAuthorizing(true);
      try {
        const updated = await jobsApi.exchangeGoogleDriveOauthCode(
          { code: input.code, redirectUri },
          token,
        );
        setConfig(updated);
        setRefreshToken("");
        await loadConfig();
        toast.success("Conta Google conectada com sucesso.");
      } catch (oauthError: unknown) {
        toast.error(
          `Falha ao concluir OAuth Google: ${toErrorMessage(oauthError)}`,
        );
      } finally {
        sessionStorage.removeItem(OAUTH_STATE_KEY);
        if (oauthPopupRef.current && !oauthPopupRef.current.closed) {
          oauthPopupRef.current.close();
        }
        if (oauthPopupWatchRef.current !== null) {
          window.clearInterval(oauthPopupWatchRef.current);
          oauthPopupWatchRef.current = null;
        }
        setAuthorizing(false);
      }
    },
    [canEdit, loadConfig, redirectUri, token],
  );

  React.useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const payload = event.data as
        | {
            type?: string;
            code?: string;
            error?: string;
            state?: string;
            errorDescription?: string;
          }
        | undefined;
      if (!payload || payload.type !== OAUTH_CALLBACK_MSG) return;
      void handleOAuthCallback({
        code: payload.code,
        error: payload.error,
        state: payload.state,
        errorDescription: payload.errorDescription,
      });
    };

    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, [handleOAuthCallback]);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");

    if (!code && !error) return;
    void handleOAuthCallback({
      code,
      error,
      state: params.get("state"),
      errorDescription: params.get("error_description")
        ? decodeURIComponent(params.get("error_description") as string)
        : null,
    });
    stripOAuthQueryParams();
  }, [handleOAuthCallback, stripOAuthQueryParams]);

  React.useEffect(() => {
    return () => {
      if (oauthPopupWatchRef.current !== null) {
        window.clearInterval(oauthPopupWatchRef.current);
      }
      if (oauthPopupRef.current && !oauthPopupRef.current.closed) {
        oauthPopupRef.current.close();
      }
    };
  }, []);

  async function handleSave() {
    if (!canEdit) return;

    const payload: {
      clientId?: string;
      clientSecret?: string;
      refreshToken?: string;
      folderId?: string;
    } = {};

    if (clientId.trim()) payload.clientId = clientId.trim();
    if (clientSecret.trim()) payload.clientSecret = clientSecret.trim();
    if (refreshToken.trim()) payload.refreshToken = refreshToken.trim();
    if (selectedFolder?.id && selectedFolder.id !== config?.folderId) {
      payload.folderId = selectedFolder.id;
    }

    if (!Object.keys(payload).length) {
      toast.info("Nenhuma alteracao para salvar.");
      return;
    }

    setSavingConfig(true);
    try {
      const updated = await jobsApi.upsertGoogleDriveBackupConfig(
        payload,
        token,
      );
      setConfig(updated);
      setClientId("");
      setClientSecret("");
      setRefreshToken("");

      if (updated.folderId) {
        try {
          const details = await jobsApi.getGoogleDriveFolderDetails(
            updated.folderId,
            token,
          );
          setSelectedFolder(details);
        } catch {
          setSelectedFolder({
            id: updated.folderId,
            name: `(ID) ${updated.folderId}`,
            parents: [],
          });
        }
      }

      toast.success("Configuracao salva com sucesso.");
    } catch (error: unknown) {
      toast.error(`Falha ao salvar configuracao: ${toErrorMessage(error)}`);
    } finally {
      setSavingConfig(false);
    }
  }

  async function handleAuthorizeGoogle() {
    if (!canEdit) return;

    if (clientId.trim() || clientSecret.trim()) {
      toast.info("Salve Client ID e Client Secret antes de conectar.");
      return;
    }
    if (!config?.hasClientId || !config?.hasClientSecret) {
      toast.info(
        "Configure e salve Client ID e Client Secret antes de conectar.",
      );
      return;
    }

    const popup = window.open(
      "about:blank",
      OAUTH_POPUP_NAME,
      "width=560,height=760,left=120,top=80,resizable,scrollbars",
    );
    if (!popup) {
      toast.error(
        "Pop-up bloqueado pelo navegador. Libere pop-ups para continuar.",
      );
      return;
    }

    oauthPopupRef.current = popup;
    if (oauthPopupWatchRef.current !== null) {
      window.clearInterval(oauthPopupWatchRef.current);
      oauthPopupWatchRef.current = null;
    }

    setAuthorizing(true);
    try {
      const state =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;
      sessionStorage.setItem(OAUTH_STATE_KEY, state);

      const { authUrl } = await jobsApi.getGoogleDriveOauthUrl(
        { redirectUri, state },
        token,
      );
      popup.location.href = authUrl;
      oauthPopupWatchRef.current = window.setInterval(() => {
        if (!oauthPopupRef.current || oauthPopupRef.current.closed) {
          if (oauthPopupWatchRef.current !== null) {
            window.clearInterval(oauthPopupWatchRef.current);
            oauthPopupWatchRef.current = null;
          }
          setAuthorizing(false);
        }
      }, 400);
    } catch (error: unknown) {
      if (popup && !popup.closed) popup.close();
      setAuthorizing(false);
      toast.error(`Falha ao iniciar OAuth Google: ${toErrorMessage(error)}`);
    }
  }

  async function handleTest() {
    if (!canView) return;

    setTesting(true);
    try {
      if (hasPendingFolderSelection && selectedFolder?.id) {
        if (!canEdit) {
          toast.error(
            "A pasta selecionada ainda nao foi salva. Solicite permissao de edicao para salvar antes de testar.",
          );
          return;
        }

        const updated = await jobsApi.upsertGoogleDriveBackupConfig(
          { folderId: selectedFolder.id },
          token,
        );
        setConfig(updated);
      }

      const res = await jobsApi.testGoogleDriveBackupConfig(token);
      toast.success(
        `Conexao OK. Pasta destino: ${res.folderName} (${res.folderId}).`,
      );
    } catch (error: unknown) {
      toast.error(`Falha no teste de backup: ${toErrorMessage(error)}`);
    } finally {
      setTesting(false);
    }
  }

  async function performRestoreBackup(file: GoogleDriveBackupFile) {
    if (!canExecute) return;

    setRestoringBackupId(file.id);
    try {
      const res = await jobsApi.restoreGoogleDriveBackup(
        { fileId: file.id },
        token,
      );
      toast.success(
        `Restauracao concluida: ${res.fileName} (${res.database}) em ${formatDateTime(res.restoredAt)}.`,
      );
      await loadBackupFiles();
    } catch (error: unknown) {
      toast.error(`Falha ao restaurar backup: ${toErrorMessage(error)}`);
    } finally {
      setRestoringBackupId(null);
    }
  }

  function handleEnterFolder(folder: GoogleDriveFolder) {
    setTrail((prev) => [...prev, folder]);
  }

  function handleGoBack() {
    setTrail((prev) => prev.slice(0, -1));
  }

  function handleGoRoot() {
    setTrail([]);
  }

  function openFolderModal() {
    if (!canUseDriveApi) {
      toast.info("Conecte a conta Google antes de selecionar a pasta.");
      return;
    }
    setFolderCandidate(selectedFolder);
    setTrail([]);
    setFolderModalOpen(true);
  }

  function closeFolderModal() {
    setFolderModalOpen(false);
    setTrail([]);
  }

  function confirmFolderSelection() {
    if (!folderCandidate) {
      toast.info("Selecione uma pasta para continuar.");
      return;
    }

    setSelectedFolder(folderCandidate);
    closeFolderModal();
  }

  function openRestoreModal() {
    if (!canUseDriveApi) {
      toast.info("Conecte a conta Google antes de restaurar backups.");
      return;
    }
    if (!config?.folderId) {
      toast.info("Defina e salve uma pasta de backup antes de restaurar.");
      return;
    }

    setRestoreCandidate(null);
    setRestoreConfirmOpen(false);
    setRestoreModalOpen(true);
  }

  function closeRestoreModal() {
    if (restoringBackupId) return;
    setRestoreConfirmOpen(false);
    setRestoreModalOpen(false);
  }

  function requestRestore() {
    if (!restoreCandidate) {
      toast.info("Selecione um backup para restaurar.");
      return;
    }
    setRestoreConfirmOpen(true);
  }

  async function confirmRestore() {
    if (!restoreCandidate) return;
    setRestoreConfirmOpen(false);
    await performRestoreBackup(restoreCandidate);
  }

  const content = (
    <div className="space-y-5 p-6 text-neutral-800 dark:text-neutral-100">
      <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/30">
        <div>
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
            Configuracao do Backup PostgreSQL no Google Drive
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Centralize credenciais, selecao da pasta de destino e restauracao de
            backups.
          </p>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Redirect URI OAuth:{" "}
            <span className="font-mono text-neutral-700 dark:text-neutral-300">{redirectUri}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Tag className={statusClass(!!config?.hasClientId)}>
            Client ID {config?.hasClientId ? "OK" : "PENDENTE"}
          </Tag>
          <Tag className={statusClass(!!config?.hasClientSecret)}>
            Client Secret {config?.hasClientSecret ? "OK" : "PENDENTE"}
          </Tag>
          <Tag className={statusClass(!!config?.hasRefreshToken)}>
            Refresh Token {config?.hasRefreshToken ? "OK" : "PENDENTE"}
          </Tag>
          <Tag className={statusClass(!!config?.hasFolderId)}>
            Pasta destino {config?.hasFolderId ? "OK" : "PENDENTE"}
          </Tag>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <DefaultInput
            label={`Client ID ${config?.clientIdPreview ? `(atual: ${config.clientIdPreview})` : ""}`}
            value={clientId}
            placeholder="Cole o OAuth Client ID"
            onChange={(e) => setClientId(e.target.value)}
            disabled={!canEdit || savingConfig || authorizing}
          />
          <DefaultInput
            label={`Client Secret ${config?.clientSecretPreview ? `(atual: ${config.clientSecretPreview})` : ""}`}
            value={clientSecret}
            type="password"
            placeholder="Cole o OAuth Client Secret"
            onChange={(e) => setClientSecret(e.target.value)}
            disabled={!canEdit || savingConfig || authorizing}
          />
          <DefaultInput
            label={`Refresh Token (opcional manual) ${config?.refreshTokenPreview ? `(atual: ${config.refreshTokenPreview})` : ""}`}
            value={refreshToken}
            type="password"
            placeholder="Deixe vazio para usar OAuth"
            onChange={(e) => setRefreshToken(e.target.value)}
            disabled={!canEdit || savingConfig || authorizing}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <DefaultButton
            onClick={() => void handleSave()}
            disabled={!canEdit || savingConfig || authorizing}
          >
            {savingConfig ? "Salvando..." : "Salvar configuracao"}
          </DefaultButton>
          <DefaultButton
            onClick={() => void handleAuthorizeGoogle()}
            disabled={!canEdit || loadingConfig || authorizing || savingConfig}
          >
            {authorizing ? "Conectando..." : "Conectar conta Google (OAuth)"}
          </DefaultButton>
          <DefaultButton
            onClick={() => void handleTest()}
            disabled={!canView || testing || loadingConfig}
          >
            {testing ? "Testando..." : "Testar backup"}
          </DefaultButton>
          <DefaultButton
            onClick={() => void loadConfig()}
            disabled={loadingConfig || savingConfig || authorizing}
          >
            {loadingConfig ? "Atualizando..." : "Atualizar status"}
          </DefaultButton>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/30">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                Pasta de destino do backup
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Selecao da pasta com navegacao entre niveis.
              </p>
            </div>
            {hasPendingFolderSelection ? (
              <Tag className="border-amber-400 text-amber-700">PENDENTE</Tag>
            ) : (
              <Tag className="border-emerald-400 text-emerald-700">
                SINCRONIZADA
              </Tag>
            )}
          </div>

          <div className="rounded-xl border border-neutral-200 bg-neutral-50/80 p-3 dark:border-neutral-700 dark:bg-neutral-900/40">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Pasta selecionada</p>
            <p className="mt-1 break-all text-sm text-neutral-800 dark:text-neutral-100">
              {selectedFolder
                ? `${selectedFolder.name} (${selectedFolder.id})`
                : "Nenhuma pasta selecionada"}
            </p>
            {hasPendingFolderSelection ? (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                Existe alteracao nao salva. Clique em salvar configuracao para
                persistir.
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <DefaultButton
              onClick={openFolderModal}
              disabled={
                !canView || !canUseDriveApi || loadingConfig || authorizing
              }
            >
              Selecionar pasta
            </DefaultButton>
            <DefaultButton
              variant="secondary"
              onClick={() => void handleSave()}
              disabled={
                !canEdit ||
                savingConfig ||
                authorizing ||
                !hasPendingFolderSelection
              }
            >
              Salvar pasta selecionada
            </DefaultButton>
          </div>

          {!canUseDriveApi ? (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Para escolher a pasta, configure Client ID/Client Secret e conclua
              o OAuth.
            </p>
          ) : null}
        </section>

        <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/30">
          <div>
            <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
              Restauracao de backup
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Selecione o backup e confirme.
            </p>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-neutral-50/80 p-3 dark:border-neutral-700 dark:bg-neutral-900/40">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Retencao automatica ativa: somente os ultimos 5 backups sao
              mantidos.
            </p>
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
              Restauracao altera o banco atual. Execute apenas em janela de
              manutencao.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <DefaultButton
              onClick={openRestoreModal}
              disabled={
                !canExecute ||
                !canUseDriveApi ||
                !config?.folderId ||
                restoringBackupId !== null
              }
            >
              Ver backups
            </DefaultButton>
          </div>

          {!config?.folderId ? (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Defina e salve uma pasta de backup antes de restaurar.
            </p>
          ) : null}
        </section>
      </div>

      <ModalShell
        open={folderModalOpen}
        onClose={closeFolderModal}
        title="Selecionar Pasta de Backup"
        subtitle="Navegue pelas pastas do Google Drive e escolha o destino."
        footer={
          <>
            <DefaultButton variant="secondary" onClick={closeFolderModal}>
              Cancelar
            </DefaultButton>
            <DefaultButton
              onClick={confirmFolderSelection}
              disabled={!folderCandidate}
            >
              Confirmar selecao
            </DefaultButton>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-neutral-50/80 p-3 dark:border-neutral-700 dark:bg-neutral-900/50">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Pasta marcada</p>
            <p className="mt-1 break-all text-sm text-neutral-800 dark:text-neutral-100">
              {folderCandidate
                ? `${folderCandidate.name} (${folderCandidate.id})`
                : "Nenhuma pasta marcada"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <DefaultButton
              onClick={handleGoRoot}
              disabled={loadingFolders || trail.length === 0}
            >
              Ir para raiz
            </DefaultButton>
            <DefaultButton
              onClick={handleGoBack}
              disabled={loadingFolders || trail.length === 0}
            >
              Voltar
            </DefaultButton>
            <DefaultButton
              variant="secondary"
              onClick={() => void loadFolders()}
              disabled={loadingFolders}
            >
              {loadingFolders ? "Atualizando..." : "Atualizar"}
            </DefaultButton>
          </div>

          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            Navegacao:{" "}
            {trail.length
              ? `Raiz / ${trail.map((f) => f.name).join(" / ")}`
              : "Raiz"}
          </div>

          <div className="rounded-xl border border-neutral-200 divide-y divide-neutral-200 dark:border-neutral-700 dark:divide-neutral-700">
            {loadingFolders ? (
              <div className="p-3 text-sm text-neutral-600 dark:text-neutral-300">
                Carregando pastas...
              </div>
            ) : folders.length === 0 ? (
              <div className="p-3 text-sm text-neutral-500 dark:text-neutral-400">
                Nenhuma pasta encontrada neste nivel.
              </div>
            ) : (
              folders.map((folder) => (
                <div
                  key={folder.id}
                  className={`flex items-center justify-between gap-3 p-3 ${
                    activeFolderId === folder.id ? "bg-neutral-100 dark:bg-neutral-800/40" : ""
                  }`}
                >
                  <button
                    type="button"
                    className="text-left text-sm text-neutral-700 transition-colors hover:text-neutral-900 dark:text-neutral-200 dark:hover:text-white"
                    onClick={() => handleEnterFolder(folder)}
                  >
                    {folder.name}
                  </button>
                  <DefaultButton
                    onClick={() => setFolderCandidate(folder)}
                    disabled={!canEdit}
                  >
                    {activeFolderId === folder.id ? "Marcada" : "Marcar"}
                  </DefaultButton>
                </div>
              ))
            )}
          </div>
        </div>
      </ModalShell>

      <ModalShell
        open={restoreModalOpen}
        onClose={closeRestoreModal}
        title="Restaurar Backup"
        subtitle="Selecione um arquivo e avance para confirmar a restauracao."
        footer={
          <>
            <DefaultButton
              variant="secondary"
              onClick={closeRestoreModal}
              disabled={restoringBackupId !== null}
            >
              Fechar
            </DefaultButton>
            <DefaultButton
              variant="secondary"
              onClick={() => void loadBackupFiles()}
              disabled={loadingBackups || restoringBackupId !== null}
            >
              {loadingBackups ? "Atualizando..." : "Atualizar lista"}
            </DefaultButton>
            <DefaultButton
              onClick={requestRestore}
              disabled={!restoreCandidate || restoringBackupId !== null}
            >
              Prosseguir para confirmacao
            </DefaultButton>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
            <p className="text-xs text-amber-700 dark:text-amber-200">
              Esta operacao sobrescreve objetos do banco atual com base no
              backup selecionado.
            </p>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-neutral-50/80 p-3 dark:border-neutral-700 dark:bg-neutral-900/50">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Backup selecionado</p>
            <p className="mt-1 break-all text-sm text-neutral-800 dark:text-neutral-100">
              {restoreCandidate
                ? `${restoreCandidate.name} (${restoreCandidate.id})`
                : "Nenhum backup selecionado"}
            </p>
            {restoreCandidate ? (
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Criado em {formatDateTime(restoreCandidate.createdTime)} -{" "}
                {formatBytes(restoreCandidate.sizeBytes)}
              </p>
            ) : null}
          </div>

          {loadingBackups ? (
            <div className="p-3 text-sm text-neutral-600 dark:text-neutral-300">
              Carregando backups...
            </div>
          ) : backupFiles.length === 0 ? (
            <div className="p-3 text-sm text-neutral-500 dark:text-neutral-400">
              Nenhum backup encontrado na pasta selecionada.
            </div>
          ) : (
            <div className="rounded-xl border border-neutral-200 divide-y divide-neutral-200 dark:border-neutral-700 dark:divide-neutral-700">
              {backupFiles.map((file) => (
                <div
                  key={file.id}
                  className={`flex flex-wrap items-center justify-between gap-3 p-3 ${
                    restoreCandidate?.id === file.id ? "bg-neutral-100 dark:bg-neutral-800/40" : ""
                  }`}
                >
                  <button
                    type="button"
                    className="min-w-0 text-left"
                    onClick={() => setRestoreCandidate(file)}
                  >
                    <p className="break-all text-sm text-neutral-700 dark:text-neutral-200">
                      {file.name}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Criado em {formatDateTime(file.createdTime)} -{" "}
                      {formatBytes(file.sizeBytes)}
                    </p>
                  </button>
                  <DefaultButton
                    onClick={() => setRestoreCandidate(file)}
                    disabled={restoringBackupId !== null}
                  >
                    {restoreCandidate?.id === file.id
                      ? "Selecionado"
                      : "Selecionar"}
                  </DefaultButton>
                </div>
              ))}
            </div>
          )}
        </div>
      </ModalShell>

      <ModalShell
        open={restoreConfirmOpen}
        onClose={() => setRestoreConfirmOpen(false)}
        title="Confirmar Restauracao"
        subtitle="Revise o backup selecionado antes de confirmar."
        maxWidthClass="max-w-xl"
        zIndexClass="z-[70]"
        footer={
          <>
            <DefaultButton
              variant="secondary"
              onClick={() => setRestoreConfirmOpen(false)}
              disabled={restoringBackupId !== null}
            >
              Cancelar
            </DefaultButton>
            <DefaultButton
              onClick={() => void confirmRestore()}
              disabled={!restoreCandidate || restoringBackupId !== null}
            >
              {restoringBackupId ? "Restaurando..." : "Confirmar restauracao"}
            </DefaultButton>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-neutral-700 dark:text-neutral-200">
            A restauracao sera executada no banco atual usando o arquivo abaixo:
          </p>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50/80 p-3 dark:border-neutral-700 dark:bg-neutral-900/60">
            <p className="break-all text-sm text-neutral-800 dark:text-neutral-100">
              {restoreCandidate
                ? restoreCandidate.name
                : "Nenhum backup selecionado"}
            </p>
            {restoreCandidate ? (
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Criado em {formatDateTime(restoreCandidate.createdTime)} -{" "}
                {formatBytes(restoreCandidate.sizeBytes)}
              </p>
            ) : null}
          </div>
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Esta acao e irreversivel no banco de dados atual.
          </p>
        </div>
      </ModalShell>
    </div>
  );

  return (
    <Layout title="Backup Google Drive">
      {isAdmin ? (
        content
      ) : (
        <PermissionGate required="dbScripts:consultar">
          {content}
        </PermissionGate>
      )}
    </Layout>
  );
}
