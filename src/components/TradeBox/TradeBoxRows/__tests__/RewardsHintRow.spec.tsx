import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { EstimatedTradeRewards } from "domain/synthetics/incentives/v2/tradeRewardEstimate";
import type { TradeRewardsEstimateState } from "domain/synthetics/incentives/v2/useTradeRewardsEstimate";
import { PRECISION } from "lib/numbers";
import { sendRewardsNavigationEvent } from "lib/userAnalytics/rewardsEvents";

import { RewardsHintRow } from "../RewardsHintRow";

vi.mock("img/ic_multiplier_solid.svg?react", () => ({ default: () => <svg /> }));
vi.mock("img/ic_arrow_right.svg?react", () => ({ default: () => <svg /> }));
vi.mock("lib/userAnalytics/rewardsEvents", () => ({
  sendRewardsNavigationEvent: vi.fn(),
}));

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

i18n.load({ en: {} });
i18n.activate("en");

function renderRow(
  rewardEstimate: TradeRewardsEstimateState,
  market?: {
    marketAddress: string;
    marketName: string;
  },
  hideWhenMultiplierIsZero = false
) {
  return render(
    <I18nProvider i18n={i18n}>
      <MemoryRouter>
        <RewardsHintRow
          rewardEstimate={rewardEstimate}
          {...market}
          hideWhenMultiplierIsZero={hideWhenMultiplierIsZero}
        />
      </MemoryRouter>
    </I18nProvider>
  );
}

describe("RewardsHintRow", () => {
  afterEach(cleanup);

  it("shows the effective multiplier and estimated token rewards", () => {
    renderRow(
      {
        enabled: true,
        multiplierDecimals: 100n,
        multiplier: 50n,
        hasKnownMultiplier: true,
        estimatedRewards: ESTIMATED_REWARDS,
      },
      {
        marketAddress: "0x52908400098527886E0F7030069857D2E4169EE7",
        marketName: "ETH/USD [WETH-USDC]",
      }
    );

    const link = screen.getByRole("link", { name: /Estimated rewards/ });
    expect(link.getAttribute("href")).toBe("/rewards");
    expect(link.textContent).toContain("0.5x");
    expect(link.textContent).toContain("Estimated rewards");
    expect(link.textContent).toContain("10 esGMX + 2 GT");

    fireEvent.click(link);
    expect(sendRewardsNavigationEvent).toHaveBeenCalledWith({
      source: "FeeBlock",
      hasEstimatedRewards: true,
      rewardsUsd: ESTIMATED_REWARDS.rewardsUsd,
      multiplier: 50n,
      multiplierDecimals: 100n,
      marketAddress: "0x52908400098527886E0F7030069857D2E4169EE7",
      marketName: "ETH/USD [WETH-USDC]",
    });
  });

  it("falls back to the estimated USD value when token prices are unavailable", () => {
    renderRow({
      enabled: true,
      multiplierDecimals: 100n,
      multiplier: 50n,
      hasKnownMultiplier: true,
      estimatedRewards: {
        ...ESTIMATED_REWARDS,
        rewardsUsd: (1234n * PRECISION) / 100n,
        esGmxRewards: undefined,
        gtRewards: undefined,
      },
    });

    const link = screen.getByRole("link", { name: /Estimated rewards/ });
    expect(link.textContent?.replace(/\s/g, "")).toContain("$12.34");
    expect(link.textContent).not.toContain("esGMX");
    expect(link.textContent).not.toContain("GT");
  });

  it("shows the generic current multiplier state when no estimate is available", () => {
    renderRow({
      enabled: true,
      multiplierDecimals: 100n,
      multiplier: 250n,
      hasKnownMultiplier: true,
      estimatedRewards: undefined,
    });

    const link = screen.getByRole("link", { name: /Current multiplier.*Earn rewards on eligible trades/ });
    expect(link.textContent).toContain("2.5x");
    expect(link.textContent).not.toContain("Estimated");
  });

  it("shows the generic zero-multiplier state when the multiplier is known", () => {
    renderRow({
      enabled: true,
      multiplierDecimals: 100n,
      multiplier: 0n,
      hasKnownMultiplier: true,
      estimatedRewards: undefined,
    });

    const link = screen.getByRole("link", { name: /Trade or stake.*unlock your rewards multiplier/ });
    expect(link.textContent).toContain("0.0x");
  });

  it("hides the zero-multiplier state when requested by the close flow", () => {
    const { container } = renderRow(
      {
        enabled: true,
        multiplierDecimals: 100n,
        multiplier: 0n,
        hasKnownMultiplier: true,
        estimatedRewards: undefined,
      },
      undefined,
      true
    );

    expect(container.innerHTML).toBe("");
  });

  it("shows the neutral generic state when the multiplier is unknown", () => {
    renderRow({
      enabled: true,
      multiplierDecimals: 100n,
      multiplier: undefined,
      hasKnownMultiplier: false,
      estimatedRewards: undefined,
    });

    const link = screen.getByRole("link", { name: /View tiers and indexed rewards/ });
    expect(link.textContent).toContain("-");
    expect(link.textContent).not.toContain("0.0x");
    expect(screen.getByText("-").getAttribute("aria-hidden")).toBe("true");
  });

  it("does not render when the estimate state is disabled", () => {
    const { container } = renderRow({
      enabled: false,
      multiplierDecimals: undefined,
      multiplier: undefined,
      hasKnownMultiplier: false,
      estimatedRewards: undefined,
    });

    expect(container.innerHTML).toBe("");
  });
});
