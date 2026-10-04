const PRODUCTION_API_URL = "https://18-143-33-249.sslip.io";

export function resolveAdminApiBaseUrl(configuredUrl: string | undefined, production: boolean): string {
  const fallback = production ? PRODUCTION_API_URL : "http://127.0.0.1:8000";
  const url = new URL((configuredUrl?.trim() || fallback).replace(/\/+$/, ""));

  if (production) {
    const host = url.hostname.toLowerCase();
    const localHost = host === "localhost" || host === "127.0.0.1" || host === "::1" ||
      /^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(host);
    if (url.protocol !== "https:" || localHost) {
      throw new Error("Admin production API must use a public HTTPS endpoint.");
    }
  }

  return url.origin + url.pathname.replace(/\/$/, "");
}

export function getAdminApiBaseUrl(): string {
  return resolveAdminApiBaseUrl(process.env.NEXT_PUBLIC_API_URL, process.env.NODE_ENV === "production");
}
