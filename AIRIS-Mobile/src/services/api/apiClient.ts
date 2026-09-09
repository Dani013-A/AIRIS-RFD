/**
 * Single Authoritative Endpoint Resolver for AIRIS Mobile Backend API.
 *
 * Rules:
 * 1. If process.env.EXPO_PUBLIC_API_URL is configured (in production or dev),
 *    returns the sanitized EXPO_PUBLIC_API_URL.
 * 2. In DEVELOPMENT mode (__DEV__):
 *    Falls back to Expo host LAN IP, Android emulator (10.0.2.2:8000), or iOS simulator (localhost:8000).
 * 3. In PRODUCTION mode (!__DEV__):
 *    Throws an explicit configuration error if EXPO_PUBLIC_API_URL is missing.
 *    NEVER silently falls back to localhost, 10.0.2.2, or LAN IPs in production.
 */
function getEnvVariable(key: string): string | undefined {
  try {
    const envObj = (globalThis as any).process?.env;
    return envObj ? envObj[key] : undefined;
  } catch {
    return undefined;
  }
}

export function getApiBaseUrl(): string {
  const envUrl = getEnvVariable("EXPO_PUBLIC_API_URL");
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, "");
  }

  // Allow local development fallbacks ONLY when running in development mode (__DEV__)
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    let hostUri: string | undefined;
    let platformOS: string | undefined;

    try {
      const expoModule = "expo-constants";
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ConstantsModule = require(expoModule);
      const Constants = ConstantsModule?.default || ConstantsModule;
      hostUri = Constants?.expoConfig?.hostUri || Constants?.manifest?.hostUri;
    } catch {
      // Safe fallback in test or non-expo runner
    }

    try {
      const rnModule = "react-native";
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Platform } = require(rnModule);
      platformOS = Platform?.OS;
    } catch {
      // Safe fallback in test or non-react-native runner
    }

    if (hostUri) {
      const lanIp = hostUri.split(":")[0];
      return `http://${lanIp}:8000`;
    }
    return platformOS === "android" ? "http://10.0.2.2:8000" : "http://localhost:8000";
  }

  // Production build without EXPO_PUBLIC_API_URL must fail clearly
  throw new Error(
    "AIRIS Production Error: EXPO_PUBLIC_API_URL is not configured. " +
      "Please specify a valid production backend URL when building the AIRIS application."
  );
}

/**
 * Returns a fully-qualified API endpoint URL for a given relative route path.
 */
export function getApiEndpoint(path: string): string {
  const baseUrl = getApiBaseUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}
