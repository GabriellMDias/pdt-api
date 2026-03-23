import { AxiosError } from 'axios';
import { clearToken } from '@/src/core/security/token-vault';
import { clearSession } from '@/src/features/auth/data/auth-db';
import type {
  ConnectivityStatus,
  LocalSessionWithUser,
} from '@/src/features/auth/types';
import { recordBootstrapError, loadBootstrapSnapshot } from '@/src/features/bootstrap/data/bootstrap-db';
import { extractErrorMessage } from '@/src/features/bootstrap/services/auth-bootstrap';
import { runInitialSync } from '@/src/features/bootstrap/services/initial-sync';
import type {
  AppBootstrapTrigger,
  BootstrapPreparationResult,
} from '@/src/features/bootstrap/types';
import { AppBootstrapError as BootstrapError, InvalidSessionError } from '@/src/features/bootstrap/types';

function isAuthError(error: unknown): boolean {
  return error instanceof AxiosError && [401, 403].includes(error.response?.status ?? 0);
}

function classifyReadinessError(
  error: unknown,
  connectivityStatus: ConnectivityStatus,
): BootstrapError {
  if (error instanceof BootstrapError) {
    return error;
  }

  if (error instanceof AxiosError) {
    if (!error.response) {
      return new BootstrapError(
        connectivityStatus === 'offline' ? 'offline' : 'unknown',
        'Falha de conectividade ao preparar o app. Verifique a internet e tente novamente.',
      );
    }

    return new BootstrapError(
      'backend',
      extractErrorMessage(error),
    );
  }

  if (connectivityStatus === 'offline') {
    return new BootstrapError(
      'offline',
      'Sem internet e sem dados mestres locais suficientes para iniciar o app.',
    );
  }

  return new BootstrapError('unknown', extractErrorMessage(error));
}

export async function prepareAuthenticatedApp(payload: {
  sessionWithUser: LocalSessionWithUser;
  connectivityStatus: ConnectivityStatus;
  triggerSource: AppBootstrapTrigger;
}): Promise<BootstrapPreparationResult> {
  const { sessionWithUser, connectivityStatus, triggerSource } = payload;
  const { session, user } = sessionWithUser;
  const cachedSnapshot = await loadBootstrapSnapshot(user.id);

  if (session.mode === 'online' && connectivityStatus === 'online') {
    try {
      const snapshot = await runInitialSync({
        userId: user.id,
        triggerSource,
      });

      return {
        snapshot,
        source: 'remote',
      };
    } catch (error) {
      if (isAuthError(error)) {
        await clearSession();
        clearToken();
        throw new InvalidSessionError();
      }

      const classifiedError = classifyReadinessError(error, connectivityStatus);
      await recordBootstrapError({
        userId: user.id,
        kind: classifiedError.kind,
        message: classifiedError.message,
        preserveReady: cachedSnapshot.hasMinimumMasterData,
      });

      if (cachedSnapshot.hasMinimumMasterData) {
        return {
          snapshot: cachedSnapshot,
          source: 'cache',
        };
      }

      throw classifiedError;
    }
  }

  if (cachedSnapshot.hasMinimumMasterData) {
    return {
      snapshot: cachedSnapshot,
      source: 'cache',
    };
  }

  const offlineError = new BootstrapError(
    connectivityStatus === 'offline' ? 'offline' : 'unknown',
    connectivityStatus === 'offline'
      ? 'Sem internet e sem dados mestres locais suficientes para iniciar o app.'
      : 'Nao foi possivel validar a conectividade para preparar o app.',
  );

  await recordBootstrapError({
    userId: user.id,
    kind: offlineError.kind,
    message: offlineError.message,
    preserveReady: false,
  });

  throw offlineError;
}
