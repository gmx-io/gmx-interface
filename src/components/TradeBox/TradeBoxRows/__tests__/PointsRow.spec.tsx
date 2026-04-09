import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockSelectTradeboxFees, mockSelectTradeboxTradeFeesType, mockSelectUserReferralInfo } = vi.hoisted(() => ({
  mockSelectTradeboxFees: Symbol("selectTradeboxFees"),
  mockSelectTradeboxTradeFeesType: Symbol("selectTradeboxTradeFeesType"),
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
  selectTradeboxTradeFeesType: mockSelectTradeboxTradeFeesType,
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

vi.mock("domain/synthetics/incentives/useIncentivesConfig", () => ({
  useIncentivesConfig: vi.fn(),
}));

vi.mock("domain/synthetics/incentives/useAccountIncentiveStatus", () => ({
  useAccountIncentiveStatus: vi.fn(),
}));

vi.mock("domain/synthetics/incentives/constants", async () => {
  const actual = await vi.importActual("domain/synthetics/incentives/constants");
  return {
    ...actual,
    isIncentivesEnabled: vi.fn(),
  };
});

vi.mock("img/ic_multiplier.svg?react", () => ({
  default: (props: any) => <svg data-testid="multiplier-icon" {...props} />,
}));

import { useSelector } from "context/SyntheticsStateContext/utils";
import { useGmxPrice } from "domain/legacy";
import { isIncentivesEnabled, MULTIPLIER_DECIMALS } from "domain/synthetics/incentives/constants";
import { getEstimatedTradeRewards } from "domain/synthetics/incentives/pointsEstimate";
import { useAccountIncentiveStatus } from "domain/synthetics/incentives/useAccountIncentiveStatus";
import { useChainId } from "lib/chains";
import useWallet from "lib/wallets/useWallet";

import { PointsRow } from "../PointsRow";

const mockUseSelector = vi.mocked(useSelector);
const mockUseGmxPrice = vi.mocked(useGmxPrice);
const mockIsIncentivesEnabled = vi.mocked(isIncentivesEnabled);
const mockUseAccountIncentiveStatus = vi.mocked(useAccountIncentiveStatus);
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
  it("calculates rewards from fees, multiplier, and referral discount", () => {
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

    expect(result?.rewardsUsd).toBe(150n * 10n ** USD_DECIMALS);
    expect(result?.rewardsGmx).toBe(75n * 10n ** 17n);
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

      if (selector === mockSelectUserReferralInfo) {
        return {
          totalRebate: 1000n,
          discountShare: 10000n,
        };
      }

      return undefined;
    });
  });

  it("renders the estimated GMX and USD rewards", () => {
    renderPointsRow();

    expect(screen.getByText("Estimated rewards")).toBeDefined();
    expect(screen.getByText(/7\.50 GMX/)).toBeDefined();
    expect(screen.getByText((content) => content.includes("150.00"))).toBeDefined();
  });
});
