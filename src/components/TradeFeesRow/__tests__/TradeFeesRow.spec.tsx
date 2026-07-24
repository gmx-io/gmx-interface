import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { EstimatedTradeRewards } from "domain/synthetics/incentives/v2/tradeRewardEstimate";
import { PRECISION } from "lib/numbers";

import { TradeFeesRow } from "../TradeFeesRow";

vi.mock("context/SettingsContext/SettingsContextProvider", () => ({
  useSettings: () => ({ breakdownNetPriceImpactEnabled: false }),
}));
vi.mock("context/SyntheticsStateContext/hooks/settingsHooks", () => ({
  useShowDebugValues: () => false,
}));
vi.mock("domain/synthetics/common/useIncentiveStats", () => ({
  useTradingIncentives: () => undefined,
}));
vi.mock("domain/synthetics/tokens/useAirdroppedTokenTitle", () => ({
  useTradingAirdroppedTokenTitle: () => undefined,
}));
vi.mock("lib/chains", () => ({
  useChainId: () => ({ chainId: 42161 }),
}));
vi.mock("components/Tooltip/TooltipWithPortal", () => ({
  default: ({ handle, content }: { handle: ReactNode; content: ReactNode }) => (
    <>
      <div data-testid="fees-handle">{handle}</div>
      <div data-testid="fees-tooltip">{content}</div>
    </>
  ),
}));
vi.mock("img/sparkle.svg", () => ({ default: "" }));

const ESTIMATED_REWARDS: EstimatedTradeRewards = {
  normalMultiplier: 50n,
  fullMultiplier: 50n,
  effectiveMultiplier: 50n,
  manualMultiplier: 0n,
  eligibleFeeUsd: 20n * PRECISION,
  baseRewardUsd: 12n * PRECISION,
  esGmxRewardsUsd: 10n * PRECISION,
  gtRewardsUsd: 2n * PRECISION,
  rewardsUsd: 12n * PRECISION,
  manualRewardsUsd: 0n,
  esGmxRewards: 10n * 10n ** 18n,
  gtRewards: 2n * 10n ** 7n,
};

const BASE_PROPS = {
  feesType: "increase",
  positionFee: {
    deltaUsd: -20n * PRECISION,
    precisePercentage: 10n,
  },
  totalFees: {
    deltaUsd: -20n * PRECISION,
    precisePercentage: 10n,
  },
} as Parameters<typeof TradeFeesRow>[0];

i18n.load({ en: {} });
i18n.activate("en");

function normalizeText(value: string | null) {
  return value
    ?.replace(/\u200a/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function renderRow(estimatedRewards?: EstimatedTradeRewards) {
  return render(
    <I18nProvider i18n={i18n}>
      <TradeFeesRow {...BASE_PROPS} estimatedRewards={estimatedRewards} />
    </I18nProvider>
  );
}

describe("TradeFeesRow estimated rewards", () => {
  afterEach(cleanup);

  it("keeps the fee total unchanged and shows informational rewards in the handle and breakdown", () => {
    renderRow(ESTIMATED_REWARDS);

    const handleText = normalizeText(screen.getByTestId("fees-handle").textContent);
    const tooltipText = normalizeText(screen.getByTestId("fees-tooltip").textContent);

    expect(handleText).toContain("-$20.00");
    expect(handleText).toContain("(+$12.00 rewards)");
    expect(tooltipText).toContain("Estimated rewards:");
    expect(tooltipText).toContain("+$12.00 (60% of net position fee)");
  });

  it("omits the compact and expanded reward details without an estimate", () => {
    renderRow();

    const handleText = normalizeText(screen.getByTestId("fees-handle").textContent);
    const tooltipText = normalizeText(screen.getByTestId("fees-tooltip").textContent);

    expect(handleText).toBe("-$20.00");
    expect(handleText).not.toContain("rewards");
    expect(tooltipText).not.toContain("Estimated rewards");
    expect(tooltipText).not.toContain("position fee");
  });
});
