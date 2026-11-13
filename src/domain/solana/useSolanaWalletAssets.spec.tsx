import { act, cleanup, render, waitFor } from "@testing-library/react";
import { ReactNode } from "react";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { setAbFlagEnabled } from "config/ab";
import { ARBITRUM, SOLANA_NETWORK_ID } from "config/chains";
import { expandDecimals } from "lib/numbers";
import { getToken, NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";

import { useSolanaWalletAssets } from "./useSolanaWalletAssets";

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

let latest: ReturnType<typeof useSolanaWalletAssets>;

function Consumer({ owner }: { owner: string | undefined }) {
  latest = useSolanaWalletAssets(owner);
  return null;
}

function mount(owner: string | undefined) {
  const config = { provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false };
  return render(<Consumer owner={owner} />, {
    wrapper: ({ children }: { children?: ReactNode }) => <SWRConfig value={config}>{children}</SWRConfig>,
  });
}

beforeEach(() => {
  setAbFlagEnabled("solanaNetwork", true);
  source.networkId = SOLANA_NETWORK_ID;
  // the Arbitrum keeper's SOL ticker: $100 in contract units (30 - token decimals)
  const arbitrumSol = getToken(ARBITRUM, ARBITRUM_SOL);
  const contractPrice = expandDecimals(100, 30 - arbitrumSol.decimals).toString();
  source.prices.mockResolvedValue([
    { tokenAddress: arbitrumSol.address, minPrice: contractPrice, maxPrice: contractPrice },
  ]);
});

afterEach(() => {
  cleanup();
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
  expect(source.balances).toHaveBeenCalledWith("wallet-a");
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
