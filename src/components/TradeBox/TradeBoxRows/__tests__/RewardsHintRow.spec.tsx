import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useIncentivesV2State } from "context/IncentivesV2Context/IncentivesV2Context";
import type { IncentivesConfig } from "domain/synthetics/incentives/v2/types";

import { RewardsHintRow } from "../RewardsHintRow";

vi.mock("context/IncentivesV2Context/IncentivesV2Context", () => ({
  useIncentivesV2State: vi.fn(),
}));

const mockUseIncentivesV2State = vi.mocked(useIncentivesV2State);
const CONFIG = { epochTimestamp: 1, epochDuration: 1 } as IncentivesConfig;

i18n.load({ en: {} });
i18n.activate("en");

function renderRow(feesType: "increase" | "decrease" | "swap") {
  return render(
    <I18nProvider i18n={i18n}>
      <MemoryRouter>
        <RewardsHintRow feesType={feesType} />
      </MemoryRouter>
    </I18nProvider>
  );
}

describe("RewardsHintRow", () => {
  beforeEach(() => {
    mockUseIncentivesV2State.mockReturnValue({
      availability: { status: "active", config: CONFIG, isStale: false },
      isActive: true,
      refreshConfig: vi.fn(),
    });
  });

  afterEach(cleanup);

  it.each(["increase", "decrease"] as const)("links eligible %s trades to Rewards", (feesType) => {
    renderRow(feesType);

    expect(
      screen
        .getByRole("link", { name: /Earn esGMX and GT rewards from eligible trading activity/ })
        .getAttribute("href")
    ).toBe("/rewards");
  });

  it("does not show the hint for swaps", () => {
    const { container } = renderRow("swap");

    expect(container.innerHTML).toBe("");
  });

  it("does not claim rewards before an incentives config is active", () => {
    mockUseIncentivesV2State.mockReturnValue({
      availability: { status: "loading" },
      isActive: false,
      refreshConfig: vi.fn(),
    });

    const { container } = renderRow("increase");

    expect(container.innerHTML).toBe("");
  });

  it("does not show the hint outside Arbitrum", () => {
    mockUseIncentivesV2State.mockReturnValue({
      availability: { status: "unsupported-chain" },
      isActive: false,
      refreshConfig: vi.fn(),
    });

    const { container } = renderRow("increase");

    expect(container.innerHTML).toBe("");
  });
});
