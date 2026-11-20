import { act, cleanup, render, waitFor } from "@testing-library/react";
import { ReactNode } from "react";
import { SWRConfig, type SWRConfiguration } from "swr";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { SWRConfigProp } from "App/swrConfig";
import { setAbFlagEnabled } from "config/ab";
import { ARBITRUM, SOLANA_NETWORK_ID } from "config/chains";
import { expandDecimals } from "lib/numbers";
import { PRICES_CACHE_TTL } from "lib/timeConstants";
import { getToken, NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";

import { useGmsolWalletAssets } from "../useGmsolWalletAssets";

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

function Consumer({ owner }: { owner: string | undefined }) {
  latest = useGmsolWalletAssets(owner);
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

it("reads nothing on EVM or without an owner", async () => {
  source.networkId = ARBITRUM;
  mount("wallet-a");
  cleanup();
  source.networkId = SOLANA_NETWORK_ID;
  mount(undefined);
  await act(async () => {
    await Promise.resolve();
  });

  expect(source.balances).not.toHaveBeenCalled();
  expect(source.prices).not.toHaveBeenCalled();
  expect(latest.assets).toBeUndefined();
  expect(latest.totalUsd).toBeUndefined();
});

it("loads, then values the wallet in USD", async () => {
  source.balances.mockResolvedValue({ [SOL]: 3_000_000_000n });
  mount("wallet-a");

  expect(latest.isLoading).toBe(true);
  expect(latest.totalUsd).toBeUndefined();

  await waitFor(() => expect(latest.totalUsd).toBe(usd(300)));
  expect(latest.isLoading).toBe(false);
  expect(latest.assets?.map((asset) => asset.symbol)).toEqual(["SOL"]);
  expect(source.balances).toHaveBeenCalledWith(expect.objectContaining({ owner: "wallet-a" }));
});

it("reports a balance error instead of an empty wallet", async () => {
  source.balances.mockRejectedValue(new Error("RPC down"));
  mount("wallet-a");

  await waitFor(() => expect(latest.balancesError?.message).toBe("RPC down"));
  expect(latest.isLoading).toBe(false);
  expect(latest.assets).toBeUndefined();
  expect(latest.totalUsd).toBeUndefined();
});

it("returns a known zero for an empty wallet", async () => {
  source.balances.mockResolvedValue({ [SOL]: 0n });
  mount("wallet-a");

  await waitFor(() => expect(latest.totalUsd).toBe(0n));
  expect(latest.assets).toEqual([]);
});

it("keeps the balances but no total when prices fail", async () => {
  source.balances.mockResolvedValue({ [SOL]: 1_000_000_000n });
  source.prices.mockRejectedValue(new Error("keeper down"));
  mount("wallet-a");

  await waitFor(() => expect(latest.pricesError?.message).toBe("keeper down"));
  await waitFor(() => expect(latest.assets?.[0].balance).toBe(1_000_000_000n));
  expect(latest.assets?.[0].balanceUsd).toBeUndefined();
  expect(latest.totalUsd).toBeUndefined();
  expect(latest.isLoading).toBe(false);
});

it("recovers failed balance and price reads at the five-second refresh cadence TRD-98", async () => {
  vi.useFakeTimers();
  vi.spyOn(Math, "random").mockReturnValue(0.5);
  source.balances.mockRejectedValue(new Error("RPC down"));
  source.prices.mockRejectedValue(new Error("keeper down"));
  mount("wallet-a", SWRConfigProp);

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
