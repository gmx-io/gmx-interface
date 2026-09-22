import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { IncentivesConfig } from "domain/synthetics/incentives/v2/types";
import { expandDecimals, PRECISION } from "lib/numbers";

import { RewardsCalculator } from "./RewardsCalculator";

vi.mock("./RewardsTradeButton", () => ({ RewardsTradeButton: () => null }));

const config: IncentivesConfig = {
  epochTimestamp: 1788912000,
  epochStartTimestamp: 1781654400,
  programStartTimestamp: 1781654400,
  epochDuration: 604800,
  volumeTierPersistenceEpochs: 4,
  multiplierDecimals: 100n,
  maxMultiplier: 1000n,
  feeShareFactor: PRECISION / 10n,
  esGmxShareFactor: PRECISION,
  gtShareFactor: PRECISION / 5n,
  referralRewardShareFactor: PRECISION / 2n,
  volumeTiers: [],
  stakingTiers: [
    { tier: "Tier1", threshold: expandDecimals(10, 18), multiplier: 100n },
    { tier: "Tier2", threshold: expandDecimals(100, 18), multiplier: 200n },
    { tier: "Tier3", threshold: expandDecimals(1_000, 18), multiplier: 300n },
  ],
  boosts: [],
  featuredMarketTokens: [],
  downgradingFactors: [],
  balancingTradesThreshold: 1_000_000n * PRECISION,
  lifetimeVolumeThreshold: 200_000_000n * PRECISION,
  manualAllocationTiers: [],
};

beforeEach(() => {
  i18n.load("en", {});
  i18n.activate("en");
});
afterEach(cleanup);

function renderCalculator(calculatorConfig = config) {
  return render(
    <I18nProvider i18n={i18n}>
      <RewardsCalculator config={calculatorConfig} loading={false} />
    </I18nProvider>
  );
}

describe("rewards calculator", () => {
  it("preserves fractional boosts and the combined multiplier in the receipt", () => {
    const view = renderCalculator({
      ...config,
      boosts: [
        { boost: "ManualAllocation", multiplier: 200n },
        { boost: "FeaturedMarkets", multiplier: 50n },
      ],
    });

    fireEvent.click(view.getByRole("checkbox", { name: "Featured markets" }));

    expect(view.getByText("+0.5x")).toBeDefined();
    expect(view.getByText("Your multiplier").nextElementSibling?.textContent).toBe("5.5x");
    expect(view.getByText("66%")).toBeDefined();
  });

  it.each([95, 99, 100])("applies the first tier when position %s displays 10 GMX", (position) => {
    const view = renderCalculator();
    const slider = view.getByRole("slider", { name: "GMX staked" });

    fireEvent.change(slider, { target: { value: String(position) } });

    expect(slider.getAttribute("aria-valuetext")).toBe("10");
    expect(view.getByText("Staking").nextElementSibling?.textContent).toBe("+1x");
  });

  it("keeps single slider steps responsive in both directions while rounding amounts", () => {
    const view = renderCalculator();
    const slider = view.getByRole("slider", { name: "GMX staked" }) as HTMLInputElement;

    for (const position of [0, 1, 4, 5, 94, 95, 99, 100, 99, 95, 94, 5, 4, 1, 0]) {
      fireEvent.change(slider, { target: { value: String(position) } });
      expect(slider.value).toBe(String(position));
      expect(view.getByText("Staking").nextElementSibling?.textContent).toBe(position >= 95 ? "+1x" : "0x");
    }
  });
});
