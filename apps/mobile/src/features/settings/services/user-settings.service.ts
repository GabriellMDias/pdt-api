import {
  deleteUserPreference,
  getUserPreferenceRow,
  upsertUserPreference,
} from '@/src/database/repositories';
import type { LocalMasterStore } from '@/src/features/bootstrap/types';
import type { AppThemeMode } from '@/src/theme/colors';

const userPreferenceKeys = {
  currentStoreId: 'current_store_id',
  autoTransmitEnabled: 'auto_transmit_enabled',
  legacyRuptureAutoTransmit: 'rupture_auto_transmit',
  appTheme: 'app_theme',
} as const;

export type UserScopedSettings = {
  currentStoreId: number | null;
  autoTransmitEnabled: boolean;
  appTheme: AppThemeMode;
};

function parsePositiveInt(value: string | null | undefined): number | null {
  const parsed = Number(value ?? 0);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseBoolean(value: string | null | undefined, fallback = false): boolean {
  if (value == null) return fallback;
  return value === '1' || value.toLowerCase() === 'true';
}

function parseAppTheme(value: string | null | undefined): AppThemeMode {
  return value === 'light' ? 'light' : 'dark';
}

export async function loadUserScopedSettings(
  userId: number,
  availableStores?: readonly Pick<LocalMasterStore, 'id'>[],
): Promise<UserScopedSettings> {
  const [currentStoreRow, autoTransmitRow, legacyAutoTransmitRow, appThemeRow] = await Promise.all([
    getUserPreferenceRow(userId, userPreferenceKeys.currentStoreId),
    getUserPreferenceRow(userId, userPreferenceKeys.autoTransmitEnabled),
    getUserPreferenceRow(userId, userPreferenceKeys.legacyRuptureAutoTransmit),
    getUserPreferenceRow(userId, userPreferenceKeys.appTheme),
  ]);

  const storedStoreId = parsePositiveInt(currentStoreRow?.preference_value);
  const currentStoreId =
    storedStoreId != null &&
    (!availableStores || availableStores.some((store) => store.id === storedStoreId))
      ? storedStoreId
      : null;

  return {
    currentStoreId,
    autoTransmitEnabled: parseBoolean(
      (autoTransmitRow ?? legacyAutoTransmitRow)?.preference_value,
      false,
    ),
    appTheme: parseAppTheme(appThemeRow?.preference_value),
  };
}

export async function setCurrentStoreForUser(
  userId: number,
  storeId: number | null,
): Promise<void> {
  if (storeId == null) {
    await deleteUserPreference(userId, userPreferenceKeys.currentStoreId);
    return;
  }

  const now = new Date().toISOString();
  await upsertUserPreference({
    userId,
    preferenceKey: userPreferenceKeys.currentStoreId,
    preferenceValue: String(storeId),
    createdAt: now,
    updatedAt: now,
  });
}

export async function getCurrentStoreForUser(userId: number): Promise<number | null> {
  const row = await getUserPreferenceRow(userId, userPreferenceKeys.currentStoreId);
  return parsePositiveInt(row?.preference_value);
}

export async function setAutoTransmitEnabledForUser(
  userId: number,
  enabled: boolean,
): Promise<void> {
  const now = new Date().toISOString();
  await upsertUserPreference({
    userId,
    preferenceKey: userPreferenceKeys.autoTransmitEnabled,
    preferenceValue: enabled ? '1' : '0',
    createdAt: now,
    updatedAt: now,
  });
  await deleteUserPreference(userId, userPreferenceKeys.legacyRuptureAutoTransmit);
}

export async function getAutoTransmitEnabledForUser(userId: number): Promise<boolean> {
  const [row, legacyRow] = await Promise.all([
    getUserPreferenceRow(userId, userPreferenceKeys.autoTransmitEnabled),
    getUserPreferenceRow(userId, userPreferenceKeys.legacyRuptureAutoTransmit),
  ]);
  return parseBoolean((row ?? legacyRow)?.preference_value, false);
}

export async function setAppThemeForUser(userId: number, theme: AppThemeMode): Promise<void> {
  const now = new Date().toISOString();
  await upsertUserPreference({
    userId,
    preferenceKey: userPreferenceKeys.appTheme,
    preferenceValue: theme,
    createdAt: now,
    updatedAt: now,
  });
}

export async function getAppThemeForUser(userId: number): Promise<AppThemeMode> {
  const row = await getUserPreferenceRow(userId, userPreferenceKeys.appTheme);
  return parseAppTheme(row?.preference_value);
}
