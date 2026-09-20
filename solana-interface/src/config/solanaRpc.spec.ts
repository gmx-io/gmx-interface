import { afterEach, describe, expect, it, vi } from "vitest";

describe("getSolanaRpcEndpoint", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("uses the local proxy endpoint in development when it is configured", async () => {
    vi.stubEnv("DEV", true);
    vi.stubEnv("VITE_APP_LOCAL_RPC_PROXY_ENDPOINT", "http://localhost:9010/");
    vi.stubEnv("VITE_APP_SOLANA_RPC_URL", "https://rpc-1.gmtrade.xyz/");
    vi.resetModules();

    const { getSolanaRpcEndpoint } = await import("./solanaRpc");

    expect(getSolanaRpcEndpoint()).toBe("http://localhost:9010/");
  });

  it("uses the remote Solana RPC URL outside local development", async () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_APP_LOCAL_RPC_PROXY_ENDPOINT", "http://localhost:9010/");
    vi.stubEnv("VITE_APP_SOLANA_RPC_URL", "https://rpc-1.gmtrade.xyz/");
    vi.resetModules();

    const { getSolanaRpcEndpoint } = await import("./solanaRpc");

    expect(getSolanaRpcEndpoint()).toBe("https://rpc-1.gmtrade.xyz/");
  });

  it("uses the remote Solana RPC URL in development when no local proxy is configured", async () => {
    vi.stubEnv("DEV", true);
    vi.stubEnv("VITE_APP_LOCAL_RPC_PROXY_ENDPOINT", "");
    vi.stubEnv("VITE_APP_SOLANA_RPC_URL", "https://rpc-1.gmtrade.xyz/");
    vi.resetModules();

    const { getSolanaRpcEndpoint } = await import("./solanaRpc");

    expect(getSolanaRpcEndpoint()).toBe("https://rpc-1.gmtrade.xyz/");
  });

  it("throws when the remote Solana RPC URL is missing", async () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_APP_LOCAL_RPC_PROXY_ENDPOINT", "");
    vi.stubEnv("VITE_APP_SOLANA_RPC_URL", "");
    vi.resetModules();

    const { getSolanaRpcEndpoint } = await import("./solanaRpc");

    expect(() => getSolanaRpcEndpoint()).toThrow("VITE_APP_SOLANA_RPC_URL is not configured");
  });
});
