import { afterEach, describe, expect, it, vi } from "vitest";

import { setAbFlagEnabled } from "config/ab";
import { ARBITRUM } from "config/chains";
import { API_UI_FLAGS_CACHE_KEY } from "config/localStorage";
import { getRelayProvider, resolveRelayProvider } from "config/relay";
import { FORCE_GELATO_FALLBACK_UI_FLAG } from "domain/synthetics/uiFlags/useUiFlagsRequest";

function persistForceFlag(chainId: number, enabled: boolean) {
  localStorage.setItem(
    `${API_UI_FLAGS_CACHE_KEY}-${chainId}`,
    JSON.stringify({ [FORCE_GELATO_FALLBACK_UI_FLAG]: { enabled, createdAt: "", updatedAt: "" } })
  );
}

describe("resolveRelayProvider", () => {
  it("keeps a chain on Gelato until it is opted in, whatever the ab flag says", () => {
    expect(resolveRelayProvider(undefined, true)).toBe("gelato");
    expect(resolveRelayProvider(undefined, false)).toBe("gelato");
  });

  it("splits an ab chain by the flag", () => {
    expect(resolveRelayProvider("ab", true)).toBe("gmx");
    expect(resolveRelayProvider("ab", false)).toBe("gelato");
  });

  it("lets a pinned provider override the flag in both directions", () => {
    expect(resolveRelayProvider("gmx", false)).toBe("gmx");
    expect(resolveRelayProvider("gelato", true)).toBe("gelato");
  });
});

describe("getRelayProvider with the force switch", () => {
  afterEach(() => {
    localStorage.clear();
    setAbFlagEnabled("gmxRelay", false);
    vi.unstubAllEnvs();
  });

  it("pulls a user off GMX Relay even when the split put them on it", () => {
    setAbFlagEnabled("gmxRelay", true);
    expect(getRelayProvider(ARBITRUM)).toBe("gmx");

    persistForceFlag(ARBITRUM, true);
    expect(getRelayProvider(ARBITRUM)).toBe("gelato");
  });

  it("outranks the build-time override too", async () => {
    vi.stubEnv("VITE_APP_RELAY_PROVIDER", "gmx");
    vi.resetModules();

    const freshRelay = await import("config/relay");
    expect(freshRelay.getRelayProvider(ARBITRUM)).toBe("gmx");

    persistForceFlag(ARBITRUM, true);
    expect(freshRelay.getRelayProvider(ARBITRUM)).toBe("gelato");
  });

  it("changes nothing when the flag is absent or false", () => {
    setAbFlagEnabled("gmxRelay", true);

    expect(getRelayProvider(ARBITRUM)).toBe("gmx");

    persistForceFlag(ARBITRUM, false);
    expect(getRelayProvider(ARBITRUM)).toBe("gmx");
  });
});
