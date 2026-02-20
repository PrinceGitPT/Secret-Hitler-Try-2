import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function loadKvModule() {
  return import("@/lib/store/kv");
}

describe("kv store", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.doUnmock("@vercel/kv");
  });

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.doUnmock("@vercel/kv");
  });

  it("uses memory backend in non-production when credentials are missing", async () => {
    const kvStore = await loadKvModule();
    kvStore.resetMemoryKvForTests();

    const diagnostics = await kvStore.getStorageDiagnostics();
    expect(diagnostics).toEqual({
      mode: "memory",
      production: false,
      hasCredentials: false
    });
  });

  it("throws KV_NOT_CONFIGURED in production when credentials are missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("KV_REST_API_URL", "");
    vi.stubEnv("KV_REST_API_TOKEN", "");

    const kvStore = await loadKvModule();
    kvStore.resetMemoryKvForTests();

    await expect(kvStore.getStorageDiagnostics()).rejects.toMatchObject({
      code: "KV_NOT_CONFIGURED"
    });
  });

  it("returns vercel-kv diagnostics when credentials and module are available", async () => {
    vi.stubEnv("KV_REST_API_URL", "https://example.test");
    vi.stubEnv("KV_REST_API_TOKEN", "token");
    vi.doMock("@vercel/kv", () => ({
      kv: {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue(undefined),
        del: vi.fn().mockResolvedValue(undefined)
      }
    }));

    const kvStore = await loadKvModule();
    kvStore.resetMemoryKvForTests();

    const diagnostics = await kvStore.getStorageDiagnostics();
    expect(diagnostics).toEqual({
      mode: "vercel-kv",
      production: false,
      hasCredentials: true
    });
  });

  it("maps KV operation failures to KV_UNAVAILABLE", async () => {
    vi.stubEnv("KV_REST_API_URL", "https://example.test");
    vi.stubEnv("KV_REST_API_TOKEN", "token");
    vi.doMock("@vercel/kv", () => ({
      kv: {
        get: vi.fn().mockRejectedValue(new Error("boom")),
        set: vi.fn().mockResolvedValue(undefined),
        del: vi.fn().mockResolvedValue(undefined)
      }
    }));

    const kvStore = await loadKvModule();
    kvStore.resetMemoryKvForTests();

    await expect(kvStore.readRoom("ROOM1")).rejects.toMatchObject({
      code: "KV_UNAVAILABLE"
    });
  });
});
