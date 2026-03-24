import type { ConfigContext, ExpoConfig } from "expo/config";

const appJson = require("./app.json");
const rootPackageJson = require("../../package.json");

const PROD_API_URL = "https://connect.pilardaterra.com.br/api";
const DEFAULT_DEV_API_URL = "http://192.168.110.30:4495/api";
const ANDROID_PACKAGE = "com.gabrielmdias.pdtmobile";
const PRODUCTION_BUILD_PROFILES = new Set(["production", "android-apk"]);
const REQUEST_INSTALL_PACKAGES_PERMISSION =
  "android.permission.REQUEST_INSTALL_PACKAGES";

function resolveAppEnv(): "development" | "production" {
  const rawEnv = String(process.env.APP_ENV ?? "").toLowerCase();
  if (rawEnv === "production") return "production";
  if (rawEnv === "development") return "development";

  const buildProfile = String(
    process.env.EAS_BUILD_PROFILE ?? "",
  ).toLowerCase();
  if (PRODUCTION_BUILD_PROFILES.has(buildProfile)) return "production";

  return "development";
}

function resolveApiUrl(appEnv: "development" | "production"): string {
  if (appEnv === "production") return PROD_API_URL;

  const rawApiUrl = process.env.API_URL ?? process.env.EXPO_PUBLIC_API_URL;
  if (rawApiUrl && rawApiUrl.trim().length > 0) {
    return rawApiUrl.trim();
  }

  return DEFAULT_DEV_API_URL;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const baseConfig = (appJson.expo ?? config) as ExpoConfig;
  const appEnv = resolveAppEnv();
  const apiUrl = resolveApiUrl(appEnv);
  const rootVersion = String(
    rootPackageJson.version ?? baseConfig.version ?? "1.0.0",
  );
  const androidVersionCode = Number(
    rootPackageJson.mobile?.androidVersionCode ??
      baseConfig.android?.versionCode ??
      1,
  );

  return {
    ...baseConfig,
    version: rootVersion,
    android: {
      ...baseConfig.android,
      package: ANDROID_PACKAGE,
      permissions: Array.from(
        new Set([
          ...(baseConfig.android?.permissions ?? []),
          REQUEST_INSTALL_PACKAGES_PERMISSION,
        ]),
      ),
      versionCode: androidVersionCode,
      softwareKeyboardLayoutMode: "pan",
    },
    extra: {
      ...baseConfig.extra,
      APP_ENV: appEnv,
      API_URL: apiUrl,
      PROD_API_URL: PROD_API_URL,
      APP_VERSION_NAME: rootVersion,
      APP_BUILD_NUMBER: androidVersionCode,
      ANDROID_PACKAGE: ANDROID_PACKAGE,
    },
  };
};
