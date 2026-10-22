import { act, cleanup, render, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { API_UI_FLAGS_CACHE_KEY } from "config/localStorage";

import type { UiFlags } from "./uiFlags";
import { useUiFlagsRequest } from "./useUiFlagsRequest";

const mocks = vi.hoisted(() => ({ fetchUiFlags: vi.fn() }));

vi.mock("lib/chains", () => ({ useChainId: () => ({ chainId: 42161 }) }));
vi.mock("lib/oracleKeeperFetcher", () => ({
  useOracleKeeperFetcher: () => ({ fetchUiFlags: mocks.fetchUiFlags }),
}));

const API_FLAGS: UiFlags = { apiMarkets: { enabled: true, createdAt: "", updatedAt: "" } };
const SWR_CONFIG = { provider: () => new Map(), dedupingInterval: 0 };

let result: ReturnType<typeof useUiFlagsRequest>;

function Harness() {
  result = useUiFlagsRequest();
  return null;
}

function setup() {
  render(
    <SWRConfig value={SWR_CONFIG}>
      <Harness />
    </SWRConfig>
  );
}

describe("useUiFlagsRequest settled state", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("settles once the keeper answers, even with the same flags as the persisted ones", async () => {
    // the persisted copy equals the answer, which keeps the fallback object in place
    localStorage.setItem(`${API_UI_FLAGS_CACHE_KEY}-42161`, JSON.stringify(API_FLAGS));
    let resolve: (flags: UiFlags) => void = () => undefined;
    mocks.fetchUiFlags.mockReturnValue(new Promise((r) => (resolve = r)));

    setup();

    expect(result.isUiFlagsSettled).toBe(false);

    await act(async () => resolve(API_FLAGS));

    await waitFor(() => expect(result.isUiFlagsSettled).toBe(true));
  });

  it("settles when the keeper request fails", async () => {
    mocks.fetchUiFlags.mockRejectedValue(new Error("keeper down"));

    setup();

    await waitFor(() => expect(result.isUiFlagsSettled).toBe(true));
  });
});
