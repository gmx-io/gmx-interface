import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { useMedia } from "react-use";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import { useConnectModal } from "context/ConnectModalContext/ConnectModalContext";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import { useBuybackWeeklyStats } from "domain/buyback/useBuybackWeeklyStats";
import { useGmxPrice } from "domain/legacy";
import { useStakingPowerData } from "domain/stake/useStakingPowerData";
import type { GlvOrMarketInfo } from "domain/synthetics/markets";
import { useChainId } from "lib/chains";
import type { StakingProcessedData } from "lib/legacy";
import { useBreakpoints } from "lib/useBreakpoints";
import useWallet from "lib/wallets/useWallet";

import AssetsList from "../../AssetsList";
import { GmxAssetCard } from "../GmxAssetCard";

vi.mock("swr", () => ({
  default: vi.fn(() => ({})),
}));

vi.mock("context/PendingTxnsContext/PendingTxnsContext", () => ({
  usePendingTxns: vi.fn(),
}));

vi.mock("context/ConnectModalContext/ConnectModalContext", () => ({
  useConnectModal: vi.fn(),
}));

vi.mock("domain/buyback/useBuybackWeeklyStats", () => ({
  useBuybackWeeklyStats: vi.fn(),
}));

vi.mock("domain/legacy", () => ({
  useGmxPrice: vi.fn(),
}));

vi.mock("domain/stake/useStakingPowerData", () => ({
  getUserEstimatedApr: vi.fn(),
  isLoyaltyTrackingActive: vi.fn(),
  useStakingPowerData: vi.fn(),
}));

vi.mock("domain/synthetics/markets/useUserEarnings", () => ({
  useUserEarnings: vi.fn(() => ({
    userEarnings: undefined,
    isLoading: false,
    isUnavailable: false,
    isEstimated365dFeesLoading: false,
    isEstimated365dFeesUnavailable: false,
  })),
}));

vi.mock("domain/synthetics/markets/useGlvUserEarnings", () => ({
  useGlvUserEarnings: vi.fn(() => ({
    glvUserEarnings: undefined,
    isLoading: false,
    isUnavailable: false,
    isEstimated365dFeesLoading: false,
    isEstimated365dFeesUnavailable: false,
  })),
}));

vi.mock("lib/chains", () => ({
  useChainId: vi.fn(),
}));

vi.mock("lib/useBreakpoints", () => ({
  useBreakpoints: vi.fn(),
}));

vi.mock("lib/wallets/useWallet", () => ({
  default: vi.fn(),
}));

vi.mock("react-use", () => ({
  useMedia: vi.fn(),
}));

vi.mock("pages/BuyGMX/BuyGmxModal", () => ({
  BuyGmxModal: () => null,
}));

vi.mock("../StakeModal", () => ({
  StakeModal: ({
    isVisible,
    setIsVisible,
    tokenSymbol,
  }: {
    isVisible: boolean;
    setIsVisible: (isVisible: boolean) => void;
    tokenSymbol: string;
  }) => (
    <div data-testid={`stake-${tokenSymbol}`} data-visible={String(isVisible)}>
      {isVisible ? (
        <button type="button" data-testid={`close-stake-${tokenSymbol}`} onClick={() => setIsVisible(false)}>
          Close
        </button>
      ) : null}
    </div>
  ),
}));

vi.mock("../VestModal", () => ({
  VestModal: () => null,
}));

const mockUsePendingTxns = vi.mocked(usePendingTxns);
const mockUseConnectModal = vi.mocked(useConnectModal);
const mockUseBuybackWeeklyStats = vi.mocked(useBuybackWeeklyStats);
const mockUseGmxPrice = vi.mocked(useGmxPrice);
const mockUseStakingPowerData = vi.mocked(useStakingPowerData);
const mockUseChainId = vi.mocked(useChainId);
const mockUseBreakpoints = vi.mocked(useBreakpoints);
const mockUseMedia = vi.mocked(useMedia);
const mockUseWallet = vi.mocked(useWallet);
const ROUTE_ENTRIES = {
  "stake-gmx": ["/earn/portfolio?operation=stake-gmx"],
  "stake-es-gmx": ["/earn/portfolio?operation=stake-es-gmx"],
};
const PRESERVED_ROUTE_ENTRIES = [
  {
    pathname: "/earn/portfolio",
    search: "?operation=stake-gmx&source=rewards",
    hash: "#staking",
    state: { from: "rewards" },
  },
];
const EMPTY_GM_GLV_ASSETS: GlvOrMarketInfo[] = [];

i18n.load({ en: {} });
i18n.activate("en");

function LocationProbe() {
  const location = useLocation<{ from?: string }>();

  return (
    <>
      <div data-testid="location-search">{location.search}</div>
      <div data-testid="location-hash">{location.hash}</div>
      <div data-testid="location-state">{location.state?.from}</div>
    </>
  );
}

function renderCard(
  operation: "stake-gmx" | "stake-es-gmx",
  initialEntries: React.ComponentProps<typeof MemoryRouter>["initialEntries"] = ROUTE_ENTRIES[operation]
) {
  return render(
    <I18nProvider i18n={i18n}>
      <MemoryRouter initialEntries={initialEntries}>
        <GmxAssetCard processedData={{} as StakingProcessedData} hasEsGmx />
        <LocationProbe />
      </MemoryRouter>
    </I18nProvider>
  );
}

function renderZeroBalanceAssetsList(operation: "stake-gmx" | "stake-es-gmx") {
  return render(
    <I18nProvider i18n={i18n}>
      <MemoryRouter initialEntries={ROUTE_ENTRIES[operation]}>
        <AssetsList
          chainId={ARBITRUM}
          processedData={{} as StakingProcessedData}
          hasAnyAssets={false}
          hasGmx={false}
          hasEsGmx={false}
          gmGlvAssets={EMPTY_GM_GLV_ASSETS}
          gtRewards={undefined}
          gtRewardsUsd={undefined}
          performanceTotal={undefined}
          performance30d={undefined}
          isPerformanceLoading={false}
          multichainMarketTokensBalances={undefined}
        />
        <LocationProbe />
      </MemoryRouter>
    </I18nProvider>
  );
}

describe("GmxAssetCard operation routing", () => {
  beforeEach(() => {
    mockUsePendingTxns.mockReturnValue({ pendingTxns: [], setPendingTxns: vi.fn() });
    mockUseConnectModal.mockReturnValue({
      openConnectModal: vi.fn(),
      connectModalOpen: false,
    });
    mockUseBuybackWeeklyStats.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: false,
    });
    mockUseGmxPrice.mockReturnValue({ gmxPrice: undefined } as ReturnType<typeof useGmxPrice>);
    mockUseStakingPowerData.mockReturnValue({
      stakingPowerData: undefined,
      isLoading: false,
      error: undefined,
      mountedAt: undefined,
      updatedAt: undefined,
      isStale: false,
    });
    mockUseChainId.mockReturnValue({ chainId: ARBITRUM, srcChainId: ARBITRUM } as ReturnType<typeof useChainId>);
    mockUseBreakpoints.mockReturnValue({ isMobile: false } as ReturnType<typeof useBreakpoints>);
    mockUseMedia.mockReturnValue(false);
    mockUseWallet.mockReturnValue({
      account: "0x52908400098527886E0F7030069857D2E4169EE7",
      active: false,
      signer: undefined,
    } as ReturnType<typeof useWallet>);
  });

  afterEach(cleanup);

  it.each([
    ["stake-gmx", "stake-GMX"],
    ["stake-es-gmx", "stake-esGMX"],
  ] as const)(
    "opens the requested %s modal and consumes the query parameter when closed",
    async (operation, modalTestId) => {
      renderCard(operation);

      await waitFor(() => {
        expect(screen.getByTestId(modalTestId).getAttribute("data-visible")).toBe("true");
        expect(screen.getByTestId("location-search").textContent).toBe(`?operation=${operation}`);
      });

      fireEvent.click(screen.getByTestId(`close-${modalTestId}`));
      await waitFor(() => {
        expect(screen.getByTestId("location-search").textContent).toBe("");
      });
    }
  );

  it.each([
    ["stake-gmx", "stake-GMX"],
    ["stake-es-gmx", "stake-esGMX"],
  ] as const)("keeps the GMX card mounted and opens %s for a zero-balance wallet", async (operation, modalTestId) => {
    renderZeroBalanceAssetsList(operation);

    await waitFor(() => {
      expect(screen.getByTestId(modalTestId).getAttribute("data-visible")).toBe("true");
    });

    fireEvent.click(screen.getByTestId(`close-${modalTestId}`));
    await waitFor(() => {
      expect(screen.getByTestId("location-search").textContent).toBe("");
      expect(screen.queryByTestId(modalTestId)).toBeNull();
    });
  });

  it("preserves unrelated location data when consuming the operation", async () => {
    renderCard("stake-gmx", PRESERVED_ROUTE_ENTRIES);

    await waitFor(() => {
      expect(screen.getByTestId("stake-GMX").getAttribute("data-visible")).toBe("true");
    });

    fireEvent.click(screen.getByTestId("close-stake-GMX"));
    await waitFor(() => {
      expect(screen.getByTestId("location-search").textContent).toBe("?source=rewards");
      expect(screen.getByTestId("location-hash").textContent).toBe("#staking");
      expect(screen.getByTestId("location-state").textContent).toBe("rewards");
    });
  });
});
