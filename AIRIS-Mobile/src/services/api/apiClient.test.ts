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

  test("Defaults to production endpoint in production when EXPO_PUBLIC_API_URL is missing or local", () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    (globalThis as any).__DEV__ = false;

    expect(getApiBaseUrl()).toBe("https://api.airis.app");

    process.env.EXPO_PUBLIC_API_URL = "http://localhost:8000";
    expect(getApiBaseUrl()).toBe("https://api.airis.app");
  });

  test("Allows dev fallbacks ONLY when running in development mode (__DEV__ = true)", () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    (globalThis as any).__DEV__ = true;

    const devUrl = getApiBaseUrl();
    expect(devUrl).toBeDefined();
    expect(typeof devUrl).toBe("string");
    expect(devUrl.length).toBeGreaterThan(0);
  });
});
