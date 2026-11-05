import { cleanup, render, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM, SOLANA_NETWORK_ID } from "config/chains";

import { type ActiveUiFlagEvent, useUiFlagEvents } from "./useUiFlagEvents";

const mocks = vi.hoisted(() => ({ networkId: 0, getOracleKeeperFetcher: vi.fn() }));

vi.mock("config/ab", async (importOriginal) => ({
  ...(await importOriginal<typeof import("config/ab")>()),
  getIsSolanaNetworkEnabled: () => true,
}));
vi.mock("lib/chains", () => ({ useChainId: () => ({ chainId: ARBITRUM, networkId: mocks.networkId }) }));
vi.mock("lib/oracleKeeperFetcher", () => ({ getOracleKeeperFetcher: mocks.getOracleKeeperFetcher }));

function mockKeeperFlags(flags: Record<string, { enabled: boolean }>) {
  const fetchUiFlags = vi.fn().mockResolvedValue(flags);
  mocks.getOracleKeeperFetcher.mockReturnValue({ fetchUiFlags });
  return fetchUiFlags;
}

const SWR_TEST_CONFIG = { provider: () => new Map(), dedupingInterval: 0 };

let latest: ActiveUiFlagEvent[] = [];

function TestComponent() {
  latest = useUiFlagEvents();
  return null;
}

function renderEvents() {
  return render(
    <SWRConfig value={SWR_TEST_CONFIG}>
      <TestComponent />
    </SWRConfig>
  );
}

beforeEach(() => {
  localStorage.clear();
  latest = [];
});

afterEach(() => {
  cleanup();
  mocks.getOracleKeeperFetcher.mockReset();
});

describe("useUiFlagEvents on Solana", () => {
  beforeEach(() => {
    mocks.networkId = SOLANA_NETWORK_ID;
  });

  it("shows the Solana banner from the untracked Arbitrum keeper fetcher", async () => {
    mockKeeperFlags({ showSolanaServiceDisruptionBanner: { enabled: true } });

    renderEvents();

    await waitFor(() => expect(latest.map((event) => event.data.id)).toEqual(["solana-service-disruption"]));
    expect(mocks.getOracleKeeperFetcher.mock.calls).toEqual([[ARBITRUM, { track: false }]]);
  });

  it("keeps the EVM banner off Solana even when its flag is on", async () => {
    const fetchUiFlags = mockKeeperFlags({
      showServiceDisruptionBanner: { enabled: true },
      showSolanaServiceDisruptionBanner: { enabled: false },
    });

    renderEvents();

    await waitFor(() => expect(fetchUiFlags).toHaveBeenCalled());
    expect(latest).toEqual([]);
  });
});

describe("useUiFlagEvents on EVM", () => {
  it("does not request the Solana flags", async () => {
    mocks.networkId = ARBITRUM;
    mockKeeperFlags({ showServiceDisruptionBanner: { enabled: true } });

    renderEvents();

    await waitFor(() => expect(latest.map((event) => event.data.id)).toEqual(["service-disruption"]));
    expect(mocks.getOracleKeeperFetcher.mock.calls).toEqual([[ARBITRUM]]);
  });
});
