import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { SOLANA_NETWORK_ID } from "config/chains";
import type { useSolanaWalletAssets } from "domain/solana/useSolanaWalletAssets";
import { expandDecimals } from "lib/numbers";

import { AvailableToTradeAssetsView } from "../AvailableToTradeAssetsView";

type WalletAssets = ReturnType<typeof useSolanaWalletAssets>;

const mocks = vi.hoisted(() => ({
  walletAssets: undefined as unknown as WalletAssets,
  evmTokensData: vi.fn(),
  owner: vi.fn(),
}));

vi.mock("wagmi", () => ({ useAccount: () => ({ chainId: undefined }) }));
vi.mock("lib/chains", () => ({ useChainId: () => ({ chainId: 42161, networkId: SOLANA_NETWORK_ID }) }));
vi.mock("lib/wallets/solanaWalletSession", () => ({ useSolanaWalletSession: () => ({ address: "wallet-a" }) }));
vi.mock("domain/solana/useSolanaWalletAssets", () => ({
  useSolanaWalletAssets: (owner: string | undefined) => {
    mocks.owner(owner);
    return mocks.walletAssets;
  },
}));
vi.mock("domain/synthetics/tokens", () => ({ useTokensDataRequest: mocks.evmTokensData }));
vi.mock("context/GmxAccountContext/hooks", () => {
  const setter = () => [undefined, vi.fn()] as const;
  return {
    useGmxAccountModalOpen: setter,
    useGmxAccountAvailableAssetsFilter: () => ["wallet", vi.fn()] as const,
    useGmxAccountWalletReceiveViewChain: setter,
    useGmxAccountWalletReceiveViewBackTo: setter,
  };
});

const SOL_ASSET = {
  address: "native",
  symbol: "SOL",
  iconSymbol: "SOL",
  name: "Solana",
  decimals: 9,
  isStable: undefined,
  balance: 2_000_000_000n,
  balanceUsd: expandDecimals(300, 30),
};

function renderView(walletAssets: Partial<WalletAssets>) {
  mocks.walletAssets = {
    isLoading: false,
    balancesError: undefined,
    pricesError: undefined,
    ...walletAssets,
  } as WalletAssets;
  return render(
    <I18nProvider i18n={i18n}>
      <AvailableToTradeAssetsView />
    </I18nProvider>
  );
}

beforeAll(() => {
  i18n.load("en", {});
  i18n.activate("en");
});

afterEach(() => {
  cleanup();
  mocks.evmTokensData.mockReset();
  mocks.owner.mockReset();
});

describe("AvailableToTradeAssetsView on Solana", () => {
  it("lists the connected wallet's assets without the EVM token data or the GMX Account tab", () => {
    const { container } = renderView({ assets: [SOL_ASSET], totalUsd: SOL_ASSET.balanceUsd });

    expect(screen.getByText("SOL")).toBeTruthy();
    expect(container.textContent).toContain("300.00");
    expect(screen.queryByText("GMX Account")).toBeNull();
    expect(mocks.owner).toHaveBeenCalledWith("wallet-a");
    expect(mocks.evmTokensData).not.toHaveBeenCalled();
  });

  it("shows an error, not an empty wallet, when the balances fail", () => {
    renderView({ assets: undefined, balancesError: new Error("RPC down") });

    expect(screen.getByText("Unable to load wallet balances")).toBeTruthy();
    expect(screen.queryByText("No assets in your wallet")).toBeNull();
  });

  it("shows a spinner while the balances load", () => {
    const { container } = renderView({ assets: undefined, isLoading: true });

    expect(container.querySelector(".animate-spin")).toBeTruthy();
    expect(screen.queryByText("No assets in your wallet")).toBeNull();
  });

  it("shows the empty state for a wallet with nothing in it", () => {
    renderView({ assets: [], totalUsd: 0n });

    expect(screen.getByText("No assets in your wallet")).toBeTruthy();
    expect(screen.queryByText("Receive to wallet")).toBeNull();
  });
});
