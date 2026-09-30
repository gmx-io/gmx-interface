import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { IncentivesConfig } from "domain/synthetics/incentives/v2/types";
import { useIncentivesEpochStats } from "domain/synthetics/incentives/v2/useIncentivesEpochStats";
import { PRECISION } from "lib/numbers";

import { RewardsEpochSummary } from "./RewardsEpochSummary";

vi.mock("domain/synthetics/incentives/v2/useIncentivesEpochStats", () => ({
  useIncentivesEpochStats: vi.fn(),
}));

const config = {
  epochTimestamp: 2_000,
  epochDuration: 1_000,
  epochStartTimestamp: 1_000,
  programStartTimestamp: 1_000,
  esGmxShareFactor: PRECISION,
  gtShareFactor: PRECISION / 5n,
} as IncentivesConfig;
const updatedConfig = { ...config, epochStartTimestamp: config.epochTimestamp };
const mockStats = vi.mocked(useIncentivesEpochStats);

function Page({ data = config }: { data?: IncentivesConfig | null }) {
  return (
    <I18nProvider i18n={i18n}>
      <RewardsEpochSummary config={data} endpoint="https://example.com/graphql" />
    </I18nProvider>
  );
}

beforeEach(() => {
  mockStats.mockReset();
  i18n.load("en", {});
  i18n.activate("en");
});

afterEach(cleanup);

describe("RewardsEpochSummary", () => {
  it.each([
    { data: undefined, isLoading: true },
    { data: undefined, error: new Error("unavailable") },
    { data: { rewardsUsd: 0n, traderCount: 0 } },
    { data: { rewardsUsd: 0n, traderCount: 2 } },
    { data: { rewardsUsd: PRECISION, traderCount: 0 } },
  ])("hides the summary without confirmed rewards: %s", (result) => {
    mockStats.mockReturnValue(result as never);
    expect(render(<Page />).container.innerHTML).toBe("");
  });

  it.each([null, { ...config, programStartTimestamp: config.epochTimestamp }])(
    "hides the summary when there is no completed program epoch",
    (data) => {
      mockStats.mockReturnValue({ data: { rewardsUsd: 1_000n * PRECISION, traderCount: 2 } } as never);
      expect(render(<Page data={data} />).container.innerHTML).toBe("");
    }
  );

  it("appears when rewards arrive and keeps confirmed totals during a failed refresh", () => {
    mockStats.mockReturnValue({ data: { rewardsUsd: 0n, traderCount: 0 } } as never);
    const view = render(<Page />);
    expect(view.container.innerHTML).toBe("");

    const data = { rewardsUsd: 20_083n * PRECISION, traderCount: 382 };
    mockStats.mockReturnValue({ data } as never);
    view.rerender(<Page />);
    expect(view.getByText("382 traders")).toBeTruthy();
    expect(view.getByRole("button").textContent).toContain("20");

    mockStats.mockReturnValue({ data, error: new Error("refresh failed") } as never);
    view.rerender(<Page />);
    expect(view.getByText("382 traders")).toBeTruthy();
  });

  it("keeps the payout visible without a breakdown when the shares changed after the paid epoch", () => {
    mockStats.mockReturnValue({ data: { rewardsUsd: 1_000n * PRECISION, traderCount: 1 } } as never);
    const view = render(<Page data={updatedConfig} />);
    expect(view.getByText("1 trader")).toBeTruthy();
    expect(view.queryByRole("button")).toBeNull();
  });
});
