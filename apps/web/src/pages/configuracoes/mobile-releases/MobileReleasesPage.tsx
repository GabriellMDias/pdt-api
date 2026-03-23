import { useCallback, useEffect, useMemo, useState } from "react";
import AndroidIcon from "@mui/icons-material/Android";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DownloadIcon from "@mui/icons-material/Download";
import PublishedWithChangesIcon from "@mui/icons-material/PublishedWithChanges";
import RadioButtonCheckedIcon from "@mui/icons-material/RadioButtonChecked";
import Layout from "../../../components/Layout";
import PermissionGate from "../../../components/PermissionGate";
import { useAuth } from "../../../hooks/useAuth";
import { toast } from "react-toastify";
import {
  mobileReleasesApi,
  type MobileRelease,
} from "./api";

function formatDateTime(value: string | null) {
  if (!value) return "Nao publicado";
  return new Date(value).toLocaleString("pt-BR");
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

const VIEW_PERMISSIONS = [
  "mobile-releases:consultar",
  "mobile-releases:publicar",
  "mobile-releases:baixar",
];

export default function MobileReleasesPage() {
  const { token } = useAuth();
  const [releases, setReleases] = useState<MobileRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [busyReleaseId, setBusyReleaseId] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [versionName, setVersionName] = useState("");
  const [buildNumber, setBuildNumber] = useState("");
  const [changelog, setChangelog] = useState("");
  const [required, setRequired] = useState(false);
  const [publishNow, setPublishNow] = useState(true);

  const loadReleases = useCallback(async () => {
    setLoading(true);
    try {
      const nextReleases = await mobileReleasesApi.list(token);
      setReleases(nextReleases);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Nao foi possivel carregar as versoes mobile.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadReleases();
  }, [loadReleases]);

  const latestRelease = useMemo(
    () => releases.find((release) => release.isLatest) ?? null,
    [releases],
  );

  async function handleUpload() {
    if (!file) {
      toast.error("Selecione uma APK antes de enviar.");
      return;
    }

    const parsedBuild = Number(buildNumber);
    if (!versionName.trim() || !Number.isInteger(parsedBuild) || parsedBuild <= 0) {
      toast.error("Informe versao e build validos.");
      return;
    }

    setSubmitting(true);
    try {
      await mobileReleasesApi.upload(
        {
          file,
          versionName: versionName.trim(),
          buildNumber: parsedBuild,
          changelog: changelog.trim(),
          required,
          publishNow,
        },
        token,
      );

      toast.success("APK enviada com sucesso.");
      setFile(null);
      setVersionName("");
      setBuildNumber("");
      setChangelog("");
      setRequired(false);
      setPublishNow(true);
      await loadReleases();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Nao foi possivel publicar a APK.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePromoteLatest(release: MobileRelease) {
    setBusyReleaseId(release.id);
    try {
      await mobileReleasesApi.update(
        release.id,
        {
          isPublished: true,
          isLatest: true,
        },
        token,
      );
      toast.success(`Build ${release.buildNumber} marcado como versao mais recente.`);
      await loadReleases();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Nao foi possivel marcar a release como latest.";
      toast.error(message);
    } finally {
      setBusyReleaseId(null);
    }
  }

  async function handleTogglePublished(release: MobileRelease) {
    setBusyReleaseId(release.id);
    try {
      await mobileReleasesApi.update(
        release.id,
        {
          isPublished: !release.isPublished,
        },
        token,
      );
      toast.success(
        !release.isPublished
          ? `Build ${release.buildNumber} publicada.`
          : `Build ${release.buildNumber} despublicada.`,
      );
      await loadReleases();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Nao foi possivel alterar o status da release.";
      toast.error(message);
    } finally {
      setBusyReleaseId(null);
    }
  }

  async function handleDownload(release: MobileRelease) {
    setBusyReleaseId(release.id);
    try {
      await mobileReleasesApi.downloadRelease(release, token);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Nao foi possivel baixar a APK.";
      toast.error(message);
    } finally {
      setBusyReleaseId(null);
    }
  }

  return (
    <Layout title="Versoes Mobile">
      <div className="h-full p-4 md:p-6">
        <div className="mx-auto flex h-full max-w-[1500px] flex-col gap-4 overflow-y-auto rounded-2xl border border-neutral-200 bg-white/95 p-4 text-neutral-800 shadow-sm dark:border-neutral-700 dark:bg-pilar-default-bg2-dark dark:text-neutral-100">
          <section className="grid gap-4 xl:grid-cols-[minmax(320px,420px)_1fr]">
            <PermissionGate required="mobile-releases:publicar">
              <div className="rounded-2xl border border-neutral-200 bg-white/90 p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/30">
                <div className="mb-4 flex items-center gap-2">
                  <CloudUploadIcon fontSize="small" />
                  <h2 className="text-lg font-semibold">Upload de APK</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-300">
                      Arquivo APK
                    </label>
                    <input
                      accept=".apk,application/vnd.android.package-archive"
                      className="block w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950/50"
                      type="file"
                      onChange={(event) => {
                        const nextFile = event.target.files?.[0] ?? null;
                        setFile(nextFile);
                      }}
                    />
                    {file ? (
                      <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                        {file.name}
                      </p>
                    ) : null}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-300">
                        Versao
                      </label>
                      <input
                        className="block w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950/50"
                        placeholder="1.2.1"
                        value={versionName}
                        onChange={(event) => setVersionName(event.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-300">
                        Build
                      </label>
                      <input
                        className="block w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950/50"
                        inputMode="numeric"
                        placeholder="10201"
                        value={buildNumber}
                        onChange={(event) => setBuildNumber(event.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-300">
                      Changelog
                    </label>
                    <textarea
                      className="block min-h-28 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950/50"
                      placeholder="Descreva o que mudou nesta APK."
                      value={changelog}
                      onChange={(event) => setChangelog(event.target.value)}
                    />
                  </div>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      checked={required}
                      type="checkbox"
                      onChange={(event) => setRequired(event.target.checked)}
                    />
                    Atualizacao obrigatoria
                  </label>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      checked={publishNow}
                      type="checkbox"
                      onChange={(event) => setPublishNow(event.target.checked)}
                    />
                    Publicar e marcar como versao mais recente
                  </label>

                  <button
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-700 bg-emerald-600 px-4 py-2.5 font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={submitting}
                    onClick={handleUpload}
                    type="button"
                  >
                    <CloudUploadIcon fontSize="small" />
                    {submitting ? "Enviando..." : "Enviar APK"}
                  </button>
                </div>
              </div>
            </PermissionGate>

            <div className="rounded-2xl border border-neutral-200 bg-gradient-to-br from-neutral-100 to-white p-4 shadow-sm dark:border-neutral-700 dark:from-neutral-900/50 dark:to-neutral-950/30">
              <div className="flex items-center gap-2">
                <AndroidIcon fontSize="small" />
                <h2 className="text-lg font-semibold">Resumo da release atual</h2>
              </div>

              {latestRelease ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-neutral-200 bg-white/80 p-3 dark:border-neutral-700 dark:bg-neutral-900/40">
                    <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                      Versao publicada
                    </p>
                    <p className="mt-1 text-xl font-semibold">
                      {latestRelease.versionName}
                    </p>
                  </div>
                  <div className="rounded-xl border border-neutral-200 bg-white/80 p-3 dark:border-neutral-700 dark:bg-neutral-900/40">
                    <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                      Build
                    </p>
                    <p className="mt-1 text-xl font-semibold">
                      {latestRelease.buildNumber}
                    </p>
                  </div>
                  <div className="rounded-xl border border-neutral-200 bg-white/80 p-3 dark:border-neutral-700 dark:bg-neutral-900/40">
                    <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                      Publicada em
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {formatDateTime(latestRelease.publishedAt)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-neutral-200 bg-white/80 p-3 dark:border-neutral-700 dark:bg-neutral-900/40">
                    <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                      Download publico
                    </p>
                    <a
                      className="mt-1 block truncate text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-300"
                      href={latestRelease.latestDownloadUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Abrir link publico da APK mais recente
                    </a>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
                  Ainda nao existe nenhuma release Android marcada como versao mais recente.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white/90 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/20">
            <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
              <h2 className="text-lg font-semibold">Historico de versoes</h2>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                Upload, publicacao e download de APKs Android distribuídas fora da Play Store.
              </p>
            </div>

            {loading ? (
              <div className="p-4 text-sm text-neutral-500 dark:text-neutral-400">
                Carregando versoes...
              </div>
            ) : releases.length === 0 ? (
              <div className="p-4 text-sm text-neutral-500 dark:text-neutral-400">
                Nenhuma release Android cadastrada.
              </div>
            ) : (
              <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {releases.map((release) => {
                  const isBusy = busyReleaseId === release.id;
                  return (
                    <div
                      key={release.id}
                      className="grid gap-4 px-4 py-4 xl:grid-cols-[minmax(0,1fr)_280px]"
                    >
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                            v{release.versionName}
                          </span>
                          <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                            build {release.buildNumber}
                          </span>
                          {release.isLatest ? (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
                              Mais recente
                            </span>
                          ) : null}
                          {release.isPublished ? (
                            <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-500/15 dark:text-sky-200">
                              Publicada
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
                              Rascunho
                            </span>
                          )}
                          {release.isRequired ? (
                            <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-200">
                              Obrigatoria
                            </span>
                          ) : null}
                        </div>

                        <div className="grid gap-2 text-sm md:grid-cols-2 xl:grid-cols-3">
                          <p>
                            <span className="font-semibold">Criada em:</span>{" "}
                            {formatDateTime(release.createdAt)}
                          </p>
                          <p>
                            <span className="font-semibold">Publicada em:</span>{" "}
                            {formatDateTime(release.publishedAt)}
                          </p>
                          <p>
                            <span className="font-semibold">Arquivo:</span>{" "}
                            {release.originalFilename}
                          </p>
                          <p>
                            <span className="font-semibold">Tamanho:</span>{" "}
                            {formatFileSize(release.fileSizeBytes)}
                          </p>
                          <p className="md:col-span-2 xl:col-span-2">
                            <span className="font-semibold">SHA-256:</span>{" "}
                            <span className="break-all text-xs">{release.sha256}</span>
                          </p>
                        </div>

                        <div className="rounded-xl border border-neutral-200 bg-neutral-50/80 p-3 text-sm dark:border-neutral-700 dark:bg-neutral-950/30">
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                            Changelog
                          </p>
                          <p className="whitespace-pre-wrap text-neutral-700 dark:text-neutral-200">
                            {release.changelog?.trim() || "Sem anotacoes para esta versao."}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 xl:items-end">
                        <PermissionGate required={VIEW_PERMISSIONS}>
                          <button
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900/40 dark:text-neutral-100 dark:hover:bg-neutral-900"
                            disabled={isBusy}
                            onClick={() => {
                              void handleDownload(release);
                            }}
                            type="button"
                          >
                            <DownloadIcon fontSize="small" />
                            Baixar APK
                          </button>
                        </PermissionGate>

                        <PermissionGate required="mobile-releases:publicar">
                          <button
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-700 bg-sky-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={isBusy || release.isLatest}
                            onClick={() => {
                              void handlePromoteLatest(release);
                            }}
                            type="button"
                          >
                            <RadioButtonCheckedIcon fontSize="small" />
                            {release.isLatest ? "Ja e latest" : "Marcar como latest"}
                          </button>

                          <button
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-700 bg-emerald-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={isBusy}
                            onClick={() => {
                              void handleTogglePublished(release);
                            }}
                            type="button"
                          >
                            <PublishedWithChangesIcon fontSize="small" />
                            {release.isPublished ? "Despublicar" : "Publicar"}
                          </button>
                        </PermissionGate>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </Layout>
  );
}
