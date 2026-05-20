import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockSelectTradeboxFees,
  mockSelectTradeboxIncreasePositionAmounts,
  mockSelectTradeboxMarketInfo,
  mockSelectTradeboxTradeFeesType,
  mockSelectTradeboxTradeFlags,
  mockSelectUserReferralInfo,
} = vi.hoisted(() => ({
  mockSelectTradeboxFees: Symbol("selectTradeboxFees"),
  mockSelectTradeboxIncreasePositionAmounts: Symbol("selectTradeboxIncreasePositionAmounts"),
  mockSelectTradeboxMarketInfo: Symbol("selectTradeboxMarketInfo"),
  mockSelectTradeboxTradeFeesType: Symbol("selectTradeboxTradeFeesType"),
  mockSelectTradeboxTradeFlags: Symbol("selectTradeboxTradeFlags"),
  mockSelectUserReferralInfo: Symbol("selectUserReferralInfo"),
}));

vi.mock("lib/chains", () => ({
  useChainId: vi.fn(),
}));

vi.mock("lib/wallets/useWallet", () => ({
  default: vi.fn(),
}));

vi.mock("context/SyntheticsStateContext/selectors/tradeboxSelectors", () => ({
  selectTradeboxFees: mockSelectTradeboxFees,
  selectTradeboxIncreasePositionAmounts: mockSelectTradeboxIncreasePositionAmounts,
  selectTradeboxMarketInfo: mockSelectTradeboxMarketInfo,
  selectTradeboxTradeFeesType: mockSelectTradeboxTradeFeesType,
  selectTradeboxTradeFlags: mockSelectTradeboxTradeFlags,
}));

vi.mock("context/SyntheticsStateContext/selectors/globalSelectors", () => ({
  selectUserReferralInfo: mockSelectUserReferralInfo,
}));

vi.mock("context/SyntheticsStateContext/utils", () => ({
  useSelector: vi.fn(),
}));

vi.mock("domain/legacy", () => ({
  useGmxPrice: vi.fn(),
}));

vi.mock("domain/synthetics/incentives/useAccountIncentiveStatus", () => ({
  useAccountIncentiveStatus: vi.fn(),
}));

vi.mock("domain/synthetics/incentives/useIncentivesConfig", () => ({
  useIncentivesConfig: vi.fn(),
}));

vi.mock("domain/synthetics/incentives/constants", async () => {
  const actual = await vi.importActual("domain/synthetics/incentives/constants");
  return {
    ...actual,
    isIncentivesEnabled: vi.fn(),
  };
});

vi.mock("img/ic_multiplier_solid.svg?react", () => ({
  default: (props: any) => <svg data-testid="multiplier-icon" {...props} />,
}));

vi.mock("lib/userAnalytics/pointsEvents", () => ({
  sendPointsPageNavigationEvent: vi.fn(),
}));

import { useSelector } from "context/SyntheticsStateContext/utils";
import { useGmxPrice } from "domain/legacy";
import { isIncentivesEnabled, MULTIPLIER_DECIMALS } from "domain/synthetics/incentives/constants";
import { getEstimatedTradeRewards } from "domain/synthetics/incentives/pointsEstimate";
import { useAccountIncentiveStatus } from "domain/synthetics/incentives/useAccountIncentiveStatus";
import { useIncentivesConfig } from "domain/synthetics/incentives/useIncentivesConfig";
import { useChainId } from "lib/chains";
import useWallet from "lib/wallets/useWallet";

import { PointsRow } from "../PointsRow";

const mockUseSelector = vi.mocked(useSelector);
const mockUseGmxPrice = vi.mocked(useGmxPrice);
const mockIsIncentivesEnabled = vi.mocked(isIncentivesEnabled);
const mockUseAccountIncentiveStatus = vi.mocked(useAccountIncentiveStatus);
const mockUseIncentivesConfig = vi.mocked(useIncentivesConfig);
const mockUseChainId = vi.mocked(useChainId);
const mockUseWallet = vi.mocked(useWallet);

const USD_DECIMALS = 30n;

i18n.load({ en: {} });
i18n.activate("en");

function renderPointsRow() {
  return render(
    <I18nProvider i18n={i18n}>
      <MemoryRouter>
        <PointsRow />
      </MemoryRouter>
    </I18nProvider>
  );
}

describe("getEstimatedTradeRewards", () => {
  it("applies multiplier to fees net of the full referral rebate", () => {
    // Spec: (fees - fees * totalRebate / 10000) * baseRate * multiplier.
    // fees=1000, totalRebate=10%  -> eligible=900
    // baseRate=10% (1000 bps), multiplier=2.5x -> reward = 900 * 0.1 * 2.5 = 225 USD
    const feeUsd = 1000n * 10n ** USD_DECIMALS;
    const gmxPrice = 20n * 10n ** USD_DECIMALS;

    const result = getEstimatedTradeRewards({
      feeUsd,
      multiplier: 250,
      multiplierDecimals: MULTIPLIER_DECIMALS,
      totalRebate: 1000n,
      discountShare: 10000n,
      gmxPrice,
    });

    expect(result?.rewardsUsd).toBe(225n * 10n ** USD_DECIMALS);
    expect(result?.rewardsGmx).toBe(1125n * 10n ** 16n);
  });

  it("ignores discountShare because totalRebate already covers both affiliate and trader", () => {
    // Same fees & multiplier as above with discountShare=0 should give the same result:
    // the deduction must be the full totalRebate, not the trader portion.
    const feeUsd = 1000n * 10n ** USD_DECIMALS;
    const gmxPrice = 20n * 10n ** USD_DECIMALS;

    const withTraderShare = getEstimatedTradeRewards({
      feeUsd,
      multiplier: 250,
      multiplierDecimals: MULTIPLIER_DECIMALS,
      totalRebate: 1000n,
      discountShare: 10000n,
      gmxPrice,
    });
    const withoutTraderShare = getEstimatedTradeRewards({
      feeUsd,
      multiplier: 250,
      multiplierDecimals: MULTIPLIER_DECIMALS,
      totalRebate: 1000n,
      discountShare: 0n,
      gmxPrice,
    });

    expect(withTraderShare?.rewardsUsd).toBe(withoutTraderShare?.rewardsUsd);
  });

  it("caps rewards at MAX_FEE_DISCOUNT_PERCENT (50%) of the fee", () => {
    // With a very large multiplier (e.g. 10x), the uncapped reward would be
    // fee * 0.1 * 10 = 100% of fee. The cap must clip this to 50% of fee.
    const feeUsd = 1000n * 10n ** USD_DECIMALS;
    const gmxPrice = 20n * 10n ** USD_DECIMALS;

    const result = getEstimatedTradeRewards({
      feeUsd,
      multiplier: 1000, // 10x
      multiplierDecimals: MULTIPLIER_DECIMALS,
      totalRebate: 0n,
      discountShare: 0n,
      gmxPrice,
    });

    // 50% of feeUsd = 500 USD
    expect(result?.rewardsUsd).toBe(500n * 10n ** USD_DECIMALS);
  });
});

describe("PointsRow", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseChainId.mockReturnValue({ chainId: 42161 } as any);
    mockUseWallet.mockReturnValue({
      account: "0x123",
      active: true,
      signer: {},
    } as any);
    mockIsIncentivesEnabled.mockReturnValue(true);
    mockUseAccountIncentiveStatus.mockReturnValue({
      data: {
        multiplier: 250,
      },
    } as any);
    mockUseGmxPrice.mockReturnValue({
      gmxPrice: 20n * 10n ** USD_DECIMALS,
    } as any);
    mockUseIncentivesConfig.mockReturnValue({
      data: {
        downgradingCoefficients: {},
        boosts: [],
        maxMultiplier: 400,
        featuredMarketTokens: [],
        balancingTradesThreshold: 0n,
      },
    } as any);
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === mockSelectTradeboxFees) {
        return {
          positionFee: {
            deltaUsd: -1000n * 10n ** USD_DECIMALS,
          },
        };
      }

      if (selector === mockSelectTradeboxTradeFeesType) {
        return "increase";
      }

      if (selector === mockSelectTradeboxTradeFlags) {
        return {
          isLong: true,
        };
      }

      if (selector === mockSelectTradeboxIncreasePositionAmounts) {
        return {
          sizeDeltaUsd: 100n * 10n ** USD_DECIMALS,
        };
      }

      if (selector === mockSelectTradeboxMarketInfo) {
        return {
          marketTokenAddress: "0xmarket",
          name: "ETH/USD [WETH-USDC]",
          longInterestUsd: 100n * 10n ** USD_DECIMALS,
          shortInterestUsd: 300n * 10n ** USD_DECIMALS,
          useOpenInterestInTokensForBalance: false,
        };
      }

      if (selector === mockSelectUserReferralInfo) {
        return {
          totalRebate: 1000n,
          discountShare: 10000n,
        };
      }

      return undefined;
    });
  });

  it("renders the estimated points and USD rewards", () => {
    renderPointsRow();

    expect(screen.getByText("Estimated points")).toBeDefined();
    expect(screen.getByText(/11\.25 pts/)).toBeDefined();
    expect(screen.getByText((content) => content.includes("225.00"))).toBeDefined();
  });

  it("renders rewards reduced by the selected market downgrading coefficient", () => {
    mockUseIncentivesConfig.mockReturnValue({
      data: {
        downgradingCoefficients: {
          "0xmarket": 50n,
        },
        boosts: [],
        maxMultiplier: 400,
        featuredMarketTokens: [],
        balancingTradesThreshold: 0n,
      },
    } as any);

    renderPointsRow();

    expect(screen.getByText(/5\.63 pts/)).toBeDefined();
    expect(screen.getByText((content) => content.includes("112.50"))).toBeDefined();
  });

  it("uses activity boosts in the displayed multiplier and reward estimate", () => {
    mockUseAccountIncentiveStatus.mockReturnValue({
      data: {
        multiplier: 325,
      },
    } as any);
    mockUseIncentivesConfig.mockReturnValue({
      data: {
        downgradingCoefficients: {},
        boosts: [
          { boost: "FeaturedMarkets", multiplier: 50 },
          { boost: "BalancingTrades", multiplier: 50 },
        ],
        maxMultiplier: 400,
        featuredMarketTokens: ["0xMARKET"],
        balancingTradesThreshold: 50n * 10n ** USD_DECIMALS,
      },
    } as any);

    renderPointsRow();

    expect(screen.getByText("4.00x")).toBeDefined();
    expect(screen.getByText(/18\.00 pts/)).toBeDefined();
    expect(screen.getByText((content) => content.includes("360.00"))).toBeDefined();
  });
});
