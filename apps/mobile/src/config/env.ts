import Constants from "expo-constants";

type AppEnv = "development" | "production";

type ExpoExtra = {
  APP_ENV?: string;
  API_URL?: string;
  PROD_API_URL?: string;
  APP_VERSION_NAME?: string;
  APP_BUILD_NUMBER?: number | string;
  ANDROID_PACKAGE?: string;
};

const PROD_API_URL = "https://connect.pilardaterra.com.br/api";
const DEFAULT_DEV_API_URL = "http://192.168.110.30:4495/api";

function normalizeBaseUrl(input: string): string {
  return input.trim().replace(/\/+$/, "");
}

function readExtra(): ExpoExtra {
  return ((Constants.expoConfig?.extra ?? {}) as ExpoExtra) ?? {};
}

function resolveAppEnv(extra: ExpoExtra): AppEnv {
  const raw = String(extra.APP_ENV ?? "").toLowerCase();
  if (raw === "production") return "production";
  return "development";
}

function resolveApiUrl(extra: ExpoExtra, appEnv: AppEnv): string {
  const fallback = appEnv === "production" ? PROD_API_URL : DEFAULT_DEV_API_URL;
  const value = extra.API_URL ?? fallback;
  return normalizeBaseUrl(value);
}

const extra = readExtra();
const appEnv = resolveAppEnv(extra);

export const ENV = Object.freeze({
  APP_ENV: appEnv,
  API_URL: resolveApiUrl(extra, appEnv),
  PROD_API_URL: normalizeBaseUrl(extra.PROD_API_URL ?? PROD_API_URL),
  IS_PRODUCTION: appEnv === "production",
  APP_VERSION_NAME: String(
    extra.APP_VERSION_NAME ?? Constants.expoConfig?.version ?? "0.0.0",
  ),
  APP_BUILD_NUMBER: Number(
    extra.APP_BUILD_NUMBER ?? Constants.expoConfig?.android?.versionCode ?? 0,
  ),
  ANDROID_PACKAGE: String(extra.ANDROID_PACKAGE ?? ""),
});

export type Environment = typeof ENV;
