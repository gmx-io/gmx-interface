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

// the split is over browsers that send express operations: the coin is tossed on the first send,
// never by the read-only consumers (availability gate, poller, metrics)
describe("lazy assignment of the relay split", () => {
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("assigns nobody at load and nobody on a passive read", async () => {
    localStorage.clear();
    vi.resetModules();

    const ab = await import("config/ab");
    const relay = await import("config/relay");

    expect(ab.getAbStorage().gmxRelay).toBeUndefined();
    relay.getRelayProvider(ARBITRUM);
    expect(ab.getAbStorage().gmxRelay).toBeUndefined();
  });

  it("assigns on the first submit and the assignment sticks", async () => {
    localStorage.clear();
    vi.resetModules();
    vi.stubGlobal("crypto", globalThis.crypto);

    const ab = await import("config/ab");
    const relay = await import("config/relay");

    const first = relay.getRelayProviderForSubmit(ARBITRUM);
    const assigned = ab.getAbStorage().gmxRelay;

    expect(assigned).toBeDefined();
    expect(first).toBe(assigned!.enabled ? "gmx" : "gelato");

    for (let i = 0; i < 5; i++) {
      expect(relay.getRelayProviderForSubmit(ARBITRUM)).toBe(first);
    }
  });
});
