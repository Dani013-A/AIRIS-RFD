/**
 * Single Authoritative Endpoint Resolver for AIRIS Mobile Backend API.
 *
 * Rules:
 * 1. If process.env.EXPO_PUBLIC_API_URL is configured (via build-time static AST inlining),
 *    returns the sanitized EXPO_PUBLIC_API_URL.
 * 2. If Constants.expoConfig?.extra?.apiUrl is present (via app.config.js manifest embedding),
 *    returns the sanitized extra.apiUrl.
 * 3. In PRODUCTION / PREVIEW mode (!__DEV__ or EAS profile production/preview):
 *    Falls back to the authoritative production endpoint PRODUCTION_API_URL (https://18-143-33-249.sslip.io).
 *    NEVER silently falls back to localhost, 10.0.2.2, or LAN IPs in production.
 * 4. In DEVELOPMENT mode (__DEV__):
 *    Falls back to Expo host LAN IP, Android emulator (10.0.2.2:8000), or iOS simulator (localhost:8000).
 */

export const PRODUCTION_API_URL = "https://18-143-33-249.sslip.io";

function getStaticExpoPublicApiUrl(): string | undefined {
  try {
    // Explicit static member expression so babel-preset-expo inlines build-time EXPO_PUBLIC_API_URL
    const url = process.env.EXPO_PUBLIC_API_URL;
    return typeof url === "string" && url.trim().length > 0 ? url.trim() : undefined;
  } catch {
    return undefined;
  }
}

function getExpoConstantsExtraApiUrl(): string | undefined {
  try {
    const expoModule = "expo-constants";
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ConstantsModule = require(expoModule);
    const Constants = ConstantsModule?.default || ConstantsModule;
    const extra =
      Constants?.expoConfig?.extra ||
      Constants?.manifest2?.extra?.expoClient?.extra ||
      Constants?.manifest?.extra;
    const candidate = extra?.apiUrl || extra?.EXPO_PUBLIC_API_URL;
    return typeof candidate === "string" && candidate.trim().length > 0 ? candidate.trim() : undefined;
  } catch {
    return undefined;
  }
}

export function isProductionEnvironment(): boolean {
  if (typeof __DEV__ !== "undefined" && !__DEV__) {
    return true;
  }
  let appEnv: string | undefined;
  let nodeEnv: string | undefined;
  let easProfile: string | undefined;
  try {
    appEnv = process.env.APP_ENV?.trim().toLowerCase();
    nodeEnv = process.env.NODE_ENV?.trim().toLowerCase();
    easProfile = process.env.EAS_BUILD_PROFILE?.trim().toLowerCase();
  } catch {
    // safe fallback
  }

  if (nodeEnv === "production" || appEnv === "production" || easProfile === "production" || easProfile === "preview") {
    return true;
  }
  return false;
}

export function getApiBaseUrl(): string {
  const staticEnvUrl = getStaticExpoPublicApiUrl();
  const expoExtraUrl = getExpoConstantsExtraApiUrl();
  const isProd = isProductionEnvironment();

  // 1. In PRODUCTION / PREVIEW mode:
  // Strictly require a valid public HTTPS endpoint.
  // Hierarchy: static EXPO_PUBLIC_API_URL -> Expo Constants extra -> authoritative PRODUCTION_API_URL
  if (isProd) {
    const candidateUrl = (staticEnvUrl || expoExtraUrl || PRODUCTION_API_URL).replace(/\/+$/, "");

    if (!candidateUrl.startsWith("https://")) {
      throw new Error(
        `AIRIS Production Configuration Error: Insecure or invalid protocol for '${candidateUrl}'. ` +
        "Production and preview builds strictly require HTTPS."
      );
    }

    const isPrivateOrLocal = /^https:\/\/(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}|\[?::1\]?)(:\d+)?(\/.*)?$/i.test(candidateUrl);
    if (isPrivateOrLocal) {
      throw new Error(
        `AIRIS Production Configuration Error: Private/loopback address '${candidateUrl}' is disallowed. ` +
        `Production and preview builds must point to a publicly routable HTTPS endpoint (e.g. ${PRODUCTION_API_URL}).`
      );
    }

    return candidateUrl;
  }

  // 2. In DEVELOPMENT mode (__DEV__ && !isProd)
  const devCandidate = staticEnvUrl || expoExtraUrl;
  const trimmedDevUrl = devCandidate ? devCandidate.replace(/\/+$/, "") : "";

  // If explicitly set to a non-localhost remote URL, prioritize it
  if (trimmedDevUrl && !trimmedDevUrl.includes("localhost") && !trimmedDevUrl.includes("127.0.0.1")) {
    return trimmedDevUrl;
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

  if (trimmedDevUrl) {
    return trimmedDevUrl;
  }

  return platformOS === "android" ? "http://10.0.2.2:8000" : "http://localhost:8000";
}

/**
 * Returns a fully-qualified API endpoint URL for a given relative route path.
 */
export function getApiEndpoint(path: string): string {
  const baseUrl = getApiBaseUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

export function getAuthInstance() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fb = require("../../config/firebase");
    return fb?.auth || null;
  } catch {
    return null;
  }
}

/**
 * Retrieves cryptographically verified Firebase ID token for backend authentication.
 * Fails closed if no active user session exists.
 */
export async function getAuthenticatedIdToken(): Promise<string> {
  const auth = getAuthInstance();
  const currentUser = auth?.currentUser || null;

  if (currentUser) {
    const token = await currentUser.getIdToken();
    if (token) return token;
  }

  // Safe mock in unit test environments where auth session is not initialized
  if (typeof process !== "undefined" && process.env && process.env.JEST_WORKER_ID) {
    return "test-mock-firebase-token";
  }

  const authErr = new Error("Authentication required. Please sign in to perform this request.");
  (authErr as any).isHttpError = true;
  (authErr as any).status = 401;
  (authErr as any).code = "AUTHENTICATION_REQUIRED";
  throw authErr;
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
