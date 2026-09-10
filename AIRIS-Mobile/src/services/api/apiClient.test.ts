import { getApiBaseUrl, getApiEndpoint } from "./apiClient";

describe("Authoritative API Endpoint Resolver (apiClient)", () => {
  const originalEnv = process.env.EXPO_PUBLIC_API_URL;
  const originalDev = (globalThis as any).__DEV__;

  afterEach(() => {
    process.env.EXPO_PUBLIC_API_URL = originalEnv;
    (globalThis as any).__DEV__ = originalDev;
  });

  test("Constructs API URL using EXPO_PUBLIC_API_URL when set to Server One", () => {
    process.env.EXPO_PUBLIC_API_URL = "https://server-one.example";
    expect(getApiBaseUrl()).toBe("https://server-one.example");
    expect(getApiEndpoint("/upload")).toBe("https://server-one.example/upload");
    expect(getApiEndpoint("interview/start")).toBe("https://server-one.example/interview/start");
  });

  test("Constructs API URL using EXPO_PUBLIC_API_URL when set to Server Two", () => {
    process.env.EXPO_PUBLIC_API_URL = "https://server-two.example";
    expect(getApiBaseUrl()).toBe("https://server-two.example");
    expect(getApiEndpoint("/normalize")).toBe("https://server-two.example/normalize");
  });

  test("Sanitizes trailing slashes in EXPO_PUBLIC_API_URL", () => {
    process.env.EXPO_PUBLIC_API_URL = "https://api.airis.edu///";
    expect(getApiBaseUrl()).toBe("https://api.airis.edu");
    expect(getApiEndpoint("/interview/start")).toBe("https://api.airis.edu/interview/start");
  });

  test("Defaults to production error when EXPO_PUBLIC_API_URL is missing in production", () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    (globalThis as any).__DEV__ = false;

    expect(() => getApiBaseUrl()).toThrow(/AIRIS Production Configuration Error: EXPO_PUBLIC_API_URL is not configured/);
  });

  test("Rejects localhost in production mode with clear diagnostic error", () => {
    (globalThis as any).__DEV__ = false;
    process.env.EXPO_PUBLIC_API_URL = "http://localhost:8000";
    expect(() => getApiBaseUrl()).toThrow(/Insecure or invalid protocol/);

    process.env.EXPO_PUBLIC_API_URL = "https://localhost:8000";
    expect(() => getApiBaseUrl()).toThrow(/Private\/loopback address/);
  });

  test("Rejects 127.0.0.1 in production mode with clear diagnostic error", () => {
    (globalThis as any).__DEV__ = false;
    process.env.EXPO_PUBLIC_API_URL = "https://127.0.0.1:8000";
    expect(() => getApiBaseUrl()).toThrow(/Private\/loopback address/);
  });

  test("Rejects LAN IP addresses in production mode with clear diagnostic error", () => {
    (globalThis as any).__DEV__ = false;
    process.env.EXPO_PUBLIC_API_URL = "https://192.168.1.50:8000";
    expect(() => getApiBaseUrl()).toThrow(/Private\/loopback address/);

    process.env.EXPO_PUBLIC_API_URL = "https://10.0.2.2:8000";
    expect(() => getApiBaseUrl()).toThrow(/Private\/loopback address/);

    process.env.EXPO_PUBLIC_API_URL = "https://172.20.10.2:8000";
    expect(() => getApiBaseUrl()).toThrow(/Private\/loopback address/);
  });

  test("Rejects insecure HTTP production endpoint with clear diagnostic error", () => {
    (globalThis as any).__DEV__ = false;
    process.env.EXPO_PUBLIC_API_URL = "http://api.airis.app";
    expect(() => getApiBaseUrl()).toThrow(/Insecure or invalid protocol/);
  });

  test("Enforces HTTPS production requirement in preview mode (EAS_BUILD_PROFILE=preview)", () => {
    (globalThis as any).__DEV__ = true;
    process.env.EAS_BUILD_PROFILE = "preview";
    process.env.EXPO_PUBLIC_API_URL = "http://localhost:8000";

    expect(() => getApiBaseUrl()).toThrow(/Insecure or invalid protocol/);

    process.env.EXPO_PUBLIC_API_URL = "https://api.airis.app";
    expect(getApiBaseUrl()).toBe("https://api.airis.app");

    delete process.env.EAS_BUILD_PROFILE;
  });

  test("Resolves valid HTTPS production endpoint cleanly in production mode", () => {
    (globalThis as any).__DEV__ = false;
    process.env.EXPO_PUBLIC_API_URL = "https://api.airis.app";
    expect(getApiBaseUrl()).toBe("https://api.airis.app");
    expect(getApiEndpoint("/upload")).toBe("https://api.airis.app/upload");
  });

  test("Allows dev fallbacks ONLY when running in development mode (__DEV__ = true)", () => {
    delete (process.env as any).EXPO_PUBLIC_API_URL;
    delete (process.env as any).NODE_ENV;
    delete (process.env as any).APP_ENV;
    delete (process.env as any).EAS_BUILD_PROFILE;
    (globalThis as any).__DEV__ = true;

    const devUrl = getApiBaseUrl();
    expect(devUrl).toBeDefined();
    expect(typeof devUrl).toBe("string");
    expect(devUrl.length).toBeGreaterThan(0);
  });
});
