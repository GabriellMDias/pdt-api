import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/src/features/auth/store/use-auth-store';
import { AppUpdateModal } from '@/src/features/app-update/components/app-update-modal';
import { fetchLatestAndroidReleaseMetadata } from '@/src/features/app-update/services/app-update-api';
import {
  downloadAndroidApk,
  getInstalledAndroidVersion,
  hasAndroidUpdateAvailable,
  isNativeAndroidUpdateRuntimeSupported,
  launchAndroidApkInstaller,
  openApkDownloadInBrowser,
  openUnknownSourcesSettings,
} from '@/src/features/app-update/services/app-update-service';
import type {
  AndroidReleaseMetadata,
  DownloadedApkInfo,
  InstalledAndroidVersion,
} from '@/src/features/app-update/types';

type ModalPhase = 'available' | 'downloading' | 'downloaded' | 'error';

export function AppUpdateCoordinator() {
  const status = useAuthStore((state) => state.status);
  const connectivityStatus = useAuthStore((state) => state.connectivityStatus);

  const [modalVisible, setModalVisible] = useState(false);
  const [latestRelease, setLatestRelease] = useState<AndroidReleaseMetadata | null>(null);
  const [installedVersion, setInstalledVersion] = useState<InstalledAndroidVersion | null>(null);
  const [phase, setPhase] = useState<ModalPhase>('available');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadedApk, setDownloadedApk] = useState<DownloadedApkInfo | null>(null);

  const hasCheckedRef = useRef(false);
  const dismissedBuildRef = useRef<number | null>(null);

  useEffect(() => {
    if (hasCheckedRef.current) return;
    if (status === 'bootstrapping') return;
    if (connectivityStatus !== 'online') return;
    if (!isNativeAndroidUpdateRuntimeSupported()) return;

    hasCheckedRef.current = true;

    void (async () => {
      try {
        const installed = getInstalledAndroidVersion();
        const latest = await fetchLatestAndroidReleaseMetadata();

        if (!latest) {
          return;
        }

        if (!hasAndroidUpdateAvailable(installed, latest)) {
          return;
        }

        if (dismissedBuildRef.current === latest.buildNumber) {
          return;
        }

        setInstalledVersion(installed);
        setLatestRelease(latest);
        setDownloadedApk(null);
        setDownloadProgress(0);
        setErrorMessage(null);
        setPhase('available');
        setModalVisible(true);
      } catch {
        // Nao interrompe a entrada no app quando a verificacao de update falha.
      }
    })();
  }, [connectivityStatus, status]);

  async function handleStartDownload() {
    if (!latestRelease) return;

    setPhase('downloading');
    setDownloadProgress(0);
    setErrorMessage(null);

    try {
      const nextDownloadedApk = await downloadAndroidApk({
        metadata: latestRelease,
        onProgress: setDownloadProgress,
      });
      setDownloadedApk(nextDownloadedApk);
      setPhase('downloaded');
      await launchAndroidApkInstaller(nextDownloadedApk);
    } catch (error) {
      setPhase('error');
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Nao foi possivel baixar ou abrir a APK.',
      );
    }
  }

  async function handleRetryInstall() {
    if (!downloadedApk) return;

    try {
      await launchAndroidApkInstaller(downloadedApk);
    } catch (error) {
      setPhase('error');
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Nao foi possivel abrir o instalador novamente.',
      );
    }
  }

  async function handleOpenBrowser() {
    if (!latestRelease) return;
    await openApkDownloadInBrowser(latestRelease);
  }

  async function handleOpenUnknownSourcesSettings() {
    try {
      await openUnknownSourcesSettings();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Nao foi possivel abrir as configuracoes de instalacao.',
      );
    }
  }

  function handleDismiss() {
    if (latestRelease) {
      dismissedBuildRef.current = latestRelease.buildNumber;
    }

    setModalVisible(false);
  }

  return (
    <AppUpdateModal
      errorMessage={errorMessage}
      installedVersion={installedVersion}
      latestRelease={latestRelease}
      phase={phase}
      progress={downloadProgress}
      visible={modalVisible}
      onConfirmDownload={() => {
        void handleStartDownload();
      }}
      onDismiss={handleDismiss}
      onOpenBrowser={() => {
        void handleOpenBrowser();
      }}
      onOpenUnknownSourcesSettings={() => {
        void handleOpenUnknownSourcesSettings();
      }}
      onRetryInstall={() => {
        void handleRetryInstall();
      }}
    />
  );
}
