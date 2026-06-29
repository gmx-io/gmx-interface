import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { WarningState } from "domain/synthetics/trade/usePriceImpactWarningState";

import { HighPriceImpactOrFeesWarningCard } from "../HighPriceImpactOrFeesWarningCard";

afterEach(cleanup);

const swapProfitFeeWarningState: WarningState = {
  shouldShowWarningForCollateral: false,
  shouldShowWarningForSwap: false,
  shouldShowWarningForSwapProfitFee: true,
  shouldShowWarningForExecutionFee: false,
  shouldShowWarningForTriggerOrders: false,
  shouldShowWarningForExternalSwap: false,
  shouldShowWarningForTwapNetworkFee: false,
  isDismissed: false,
  setIsDismissed: vi.fn(),
  shouldShowWarning: true,
};

describe("HighPriceImpactOrFeesWarningCard", () => {
  it("renders custom swap profit fee warning content when provided", () => {
    const { container } = render(
      <HighPriceImpactOrFeesWarningCard
        priceImpactWarningState={swapProfitFeeWarningState}
        swapProfitFeeWarning={<span>Receiving as USDC will swap your profit.</span>}
      />
    );

    expect(container.textContent).toContain("Receiving as USDC will swap your profit.");
    expect(container.textContent).not.toContain("High swap profit fee");
  });
});
