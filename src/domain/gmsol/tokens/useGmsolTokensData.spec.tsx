import { render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { SWRConfig } from "swr";
import { expect, it, vi } from "vitest";

import { GMSOL_TOKENS } from "config/gmsol/tokens";
import type { SolanaBalances } from "lib/solana/balances";

import { useGmsolTokensData } from "./useGmsolTokensData";

vi.mock("lib/oracleKeeperFetcher/useOracleKeeperFetcher", () => {
  const fetcher = { url: "http://oracle.test" };
  return { useOracleKeeperFetcher: () => fetcher };
});
vi.mock("./fetchGmsolPrices", () => ({
  fetchGmsolPrices: async () =>
    Object.fromEntries(
      GMSOL_TOKENS.map(({ address }) => [
        address,
        {
          minPrice: 10n ** 30n,
          maxPrice: 10n ** 30n,
          updatedAt: Date.now(),
        },
      ])
    ),
}));

const usdc = GMSOL_TOKENS.find(({ symbol }) => symbol === "USDC")!.address;
const fundedBalances = { [usdc]: 7817480n };
const zeroBalances = { [usdc]: 0n };

it("feeds wallet balances into shared token data without retaining them across scope changes TRD-70", async () => {
  const cache = new Map();
  const swrConfig = { provider: () => cache, dedupingInterval: 0 };
  const wrapper = ({ children }: { children?: ReactNode }) => <SWRConfig value={swrConfig}>{children}</SWRConfig>;
  let current: ReturnType<typeof useGmsolTokensData>;
  function Consumer({ balancesData }: { balancesData?: SolanaBalances }) {
    current = useGmsolTokensData({ enabled: true, rawMarketsInfoData: undefined, balancesData });
    return null;
  }
  const { rerender } = render(<Consumer />, { wrapper });
  await waitFor(() => expect(current!.tokensData?.[usdc]).toBeDefined());
  expect(current!.tokensData![usdc].balance).toBeUndefined();
  expect(current!.isBalancesLoaded).toBe(false);
  rerender(<Consumer balancesData={fundedBalances} />);
  expect(current!.tokensData![usdc]).toMatchObject({ balance: 7817480n, walletBalance: 7817480n });
  expect(current!.isWalletBalancesLoaded).toBe(true);
  expect(current!.isGmxAccountBalancesLoaded).toBe(false);
  // Pending owner/network reads and RPC errors supply undefined, never the previous wallet's funds.
  rerender(<Consumer />);
  expect(current!.tokensData![usdc].balance).toBeUndefined();
  expect(current!.tokensData![usdc].walletBalance).toBeUndefined();
  expect(current!.isBalancesLoaded).toBe(false);
  rerender(<Consumer balancesData={zeroBalances} />);
  expect(current!.tokensData![usdc].balance).toBe(0n);
  expect(current!.isBalancesLoaded).toBe(true);
});
