import { act, cleanup, render, waitFor } from "@testing-library/react";
import { ReactNode } from "react";
import { SWRConfig, useSWRConfig, type SWRConfiguration } from "swr";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { SWRConfigProp } from "App/swrConfig";
import { setAbFlagEnabled } from "config/ab";
import { ARBITRUM, SOLANA_NETWORK_ID } from "config/chains";
import { expandDecimals } from "lib/numbers";
import { PRICES_CACHE_TTL } from "lib/timeConstants";
import { getToken, NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";

import { useGmsolWalletAssets } from "../useGmsolWalletAssets";
import { getSolanaBalancesKey } from "../useGmsolWalletBalances";

const source = vi.hoisted(() => ({ balances: vi.fn(), prices: vi.fn(), networkId: -501 }));

vi.mock("lib/chains", () => ({ useChainId: () => ({ networkId: source.networkId }) }));
vi.mock("lib/solana/balances", () => ({ fetchSolanaBalances: source.balances }));
vi.mock("lib/oracleKeeperFetcher", () => ({
  useOracleKeeperFetcher: () => ({ url: "https://keeper", fetchTickers: source.prices }),
}));

// native SOL is keyed like native ETH, and priced by Arbitrum's SOL
const SOL = NATIVE_TOKEN_ADDRESS;
const ARBITRUM_SOL = "0x2bcC6D6CdBbDC0a4071e48bb3B969b06B3330c07";
const usd = (value: number) => expandDecimals(value, 30);

// the Arbitrum keeper's SOL ticker: $100 in contract units (30 - token decimals)
function solTicker(updatedAt: number) {
  const arbitrumSol = getToken(ARBITRUM, ARBITRUM_SOL);
  const contractPrice = expandDecimals(100, 30 - arbitrumSol.decimals).toString();
  return { tokenAddress: arbitrumSol.address, minPrice: contractPrice, maxPrice: contractPrice, updatedAt };
}

let latest: ReturnType<typeof useGmsolWalletAssets>;
let invalidate: ReturnType<typeof useSWRConfig>["mutate"];

function Consumer({ owner }: { owner: string | undefined }) {
  latest = useGmsolWalletAssets(owner);
  invalidate = useSWRConfig().mutate;
  return null;
}

function mount(
  owner: string | undefined,
  swrConfig: SWRConfiguration = { dedupingInterval: 0, shouldRetryOnError: false }
) {
  const config = { ...swrConfig, provider: () => new Map() };
  return render(<Consumer owner={owner} />, {
    wrapper: ({ children }: { children?: ReactNode }) => <SWRConfig value={config}>{children}</SWRConfig>,
  });
}

beforeEach(() => {
  setAbFlagEnabled("solanaNetwork", true);
  source.networkId = SOLANA_NETWORK_ID;
  source.prices.mockResolvedValue([solTicker(Date.now())]);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  source.balances.mockReset();
  source.prices.mockReset();
  setAbFlagEnabled("solanaNetwork", false);
});

it.each([
  [ARBITRUM, true, "wallet-a"],
  [SOLANA_NETWORK_ID, false, "wallet-a"],
  [SOLANA_NETWORK_ID, true, undefined],
] as const)("does not read for inactive network/flag/owner: %s %s %s", async (networkId, enabled, owner) => {
  source.networkId = networkId;
  setAbFlagEnabled("solanaNetwork", enabled);
  mount(owner);
  await act(async () => {
    await Promise.resolve();
  });
  expect(source.balances).not.toHaveBeenCalled();
  expect(source.prices).not.toHaveBeenCalled();
  expect(latest.assets).toBeUndefined();
});

it("isolates pending wallet reads and invalidates the selected owner after transactions", async () => {
  let resolveOld!: (balances: Record<string, bigint>) => void;
  source.balances.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveOld = resolve;
      })
  );
  const view = mount("wallet-a");
  await waitFor(() => expect(source.balances).toHaveBeenCalledTimes(1));
  expect(latest.isLoading).toBe(true);
  source.balances.mockResolvedValue({ [SOL]: 1_000_000_000n });
  view.rerender(<Consumer owner="wallet-b" />);
  await waitFor(() => expect(latest.totalUsd).toBe(usd(100)));
  await act(async () => {
    resolveOld({ [SOL]: 99_000_000_000n });
  });
  expect(latest.totalUsd).toBe(usd(100));
  source.balances.mockResolvedValue({ [SOL]: 2_000_000_000n });
  await act(async () => {
    await invalidate(getSolanaBalancesKey(SOLANA_NETWORK_ID, "wallet-b"));
  });
  expect(latest.totalUsd).toBe(usd(200));
  source.networkId = ARBITRUM;
  view.rerender(<Consumer owner="wallet-b" />);
  expect(latest.assets).toBeUndefined();
  expect(latest.totalUsd).toBeUndefined();
});

it.each(["balance error", "price error", "empty wallet"])("keeps unknown and zero distinct: %s", async (mode) => {
  source.balances.mockResolvedValue({ [SOL]: mode === "empty wallet" ? 0n : 1_000_000_000n });
  if (mode === "balance error") source.balances.mockRejectedValue(new Error("RPC down"));
  if (mode === "price error") source.prices.mockRejectedValue(new Error("keeper down"));
  mount("wallet-a");
  await waitFor(() => expect(latest.isLoading).toBe(false));
  expect(latest.balancesError?.message).toBe(mode === "balance error" ? "RPC down" : undefined);
  expect(latest.pricesError?.message).toBe(mode === "price error" ? "keeper down" : undefined);
  expect(latest.totalUsd).toBe(mode === "empty wallet" ? 0n : undefined);
  expect(latest.assets?.length).toBe(mode === "balance error" ? undefined : mode === "empty wallet" ? 0 : 1);
  if (mode === "price error") expect(latest.assets?.[0].balanceUsd).toBeUndefined();
});

it("recovers failed balance and price reads at the five-second refresh cadence TRD-98", async () => {
  vi.useFakeTimers();
  vi.spyOn(Math, "random").mockReturnValue(0.5);
  source.balances.mockRejectedValue(new Error("RPC down"));
  source.prices.mockRejectedValue(new Error("keeper down"));
  const view = mount("wallet-a", SWRConfigProp);

  await act(async () => {
    await vi.dynamicImportSettled();
    await vi.advanceTimersByTimeAsync(30_000);
  });
  expect(latest.balancesError?.message).toBe("RPC down");
  expect(latest.pricesError?.message).toBe("keeper down");

  source.balances.mockResolvedValue({ [SOL]: 1_000_000_000n });
  source.prices.mockResolvedValue([solTicker(Date.now())]);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5_000);
  });
  expect(latest.balancesError).toBeUndefined();
  expect(latest.totalUsd).toBe(usd(100));
  const reads = source.balances.mock.calls.length;
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5_000);
  });
  expect(source.balances).toHaveBeenCalledTimes(reads);
  view.unmount();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5_000);
  });
  expect(source.balances).toHaveBeenCalledTimes(reads);
});

it.each([
  ["arrives past the trade price TTL", PRICES_CACHE_TTL + 1_000, 0, undefined],
  ["reaches the trade price TTL while the refresh hangs", 20_000, 9_999, usd(100)],
  ["outlives the refresh grace while the read stalls", 0, 15_000, usd(100)],
])(
  "keeps held balances without USD once the price %s TRD-98",
  async (_, tickerAge, lastValuedAfterMs, totalUsdBeforeExpiry) => {
    vi.useFakeTimers();
    source.balances.mockResolvedValue({ [SOL]: 1_000_000_000n });
    source.prices
      .mockResolvedValueOnce([solTicker(Date.now() - tickerAge)])
      .mockReturnValue(new Promise(() => undefined));
    mount("wallet-a");

    await act(async () => {
      await vi.dynamicImportSettled();
      await vi.advanceTimersByTimeAsync(lastValuedAfterMs);
    });
    expect(latest.totalUsd).toBe(totalUsdBeforeExpiry);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(latest.assets?.map((asset) => [asset.symbol, asset.balance, asset.balanceUsd])).toEqual([
      ["SOL", 1_000_000_000n, undefined],
    ]);
    expect(latest.totalUsd).toBeUndefined();
    expect(latest.isLoading).toBe(false);
  }
);
