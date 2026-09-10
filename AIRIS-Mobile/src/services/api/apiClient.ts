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
  const trimmedEnvUrl = envUrl ? envUrl.trim().replace(/\/+$/, "") : "";

  // 1. In DEVELOPMENT mode (__DEV__)
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    // If EXPO_PUBLIC_API_URL is explicitly set to a non-localhost URL, prioritize it
    if (trimmedEnvUrl && !trimmedEnvUrl.includes("localhost") && !trimmedEnvUrl.includes("127.0.0.1")) {
      return trimmedEnvUrl;
    }

    let hostUri: string | undefined;
    let scriptURL: string | undefined;
    let platformOS: string | undefined;

    try {
      const expoModule = "expo-constants";
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ConstantsModule = require(expoModule);
      const Constants = ConstantsModule?.default || ConstantsModule;
      hostUri = Constants?.expoConfig?.hostUri || Constants?.manifest?.hostUri || Constants?.manifest2?.extra?.expoGo?.developer?.manifest?.debuggerHost;
    } catch {
      // Safe fallback in test or non-expo runner
    }

    try {
      const rnModule = "react-native";
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Platform, NativeModules } = require(rnModule);
      platformOS = Platform?.OS;
      scriptURL = NativeModules?.SourceCode?.scriptURL;
    } catch {
      // Safe fallback in test or non-react-native runner
    }

    // Extract LAN IP from Expo Metro hostUri (e.g. "192.168.1.9:8081") or scriptURL
    let lanIp: string | undefined;
    if (hostUri && hostUri.includes(":")) {
      const candidateIp = hostUri.split(":")[0];
      if (candidateIp && candidateIp !== "localhost" && candidateIp !== "127.0.0.1") {
        lanIp = candidateIp;
      }
    } else if (scriptURL && scriptURL.includes("://")) {
      const hostPart = scriptURL.split("://")[1]?.split("/")[0]?.split(":")[0];
      if (hostPart && hostPart !== "localhost" && hostPart !== "127.0.0.1") {
        lanIp = hostPart;
      }
    }

    // If host LAN IP is detected on physical device/simulator, resolve http://<lanIp>:8000
    if (lanIp) {
      return `http://${lanIp}:8000`;
    }

    if (trimmedEnvUrl) {
      return trimmedEnvUrl;
    }

    return platformOS === "android" ? "http://10.0.2.2:8000" : "http://localhost:8000";
  }

  // 2. In PRODUCTION mode (!__DEV__): MUST use explicit HTTPS endpoint; disallow localhost/LAN IPs
  const isPrivateIp = /^(http:\/\/)?(localhost|127\.0\.0\.1|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1]))/i.test(trimmedEnvUrl);
  if (trimmedEnvUrl && !isPrivateIp) {
    return trimmedEnvUrl;
  }

  return "https://api.airis.app";
}

/**
 * Returns a fully-qualified API endpoint URL for a given relative route path.
 */
export function getApiEndpoint(path: string): string {
  const baseUrl = getApiBaseUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

export interface BackendHealthResult {
  online: boolean;
  status?: number;
  latencyMs?: number;
  baseUrl: string;
  error?: string;
}

/**
 * Development health check helper.
 * Performs a fast GET request to the root backend endpoint.
 */
export async function checkBackendHealth(): Promise<BackendHealthResult> {
  const baseUrl = getApiBaseUrl();
  const startTime = Date.now();
  try {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 5000) : null;
    const response = await fetch(`${baseUrl}/`, {
      method: "GET",
      signal: controller?.signal,
    });
    if (timeoutId) clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;
    return {
      online: response.status === 200,
      status: response.status,
      latencyMs,
      baseUrl,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      online: false,
      latencyMs,
      baseUrl,
      error: err?.message || String(err),
    };
  }
}
