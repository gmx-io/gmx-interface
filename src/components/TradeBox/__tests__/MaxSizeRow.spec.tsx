import { i18n } from "@lingui/core";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import { getIncreaseError } from "domain/synthetics/trade/utils/validation";
import { expandDecimals } from "lib/numbers";
import { mockMarketsInfoData, mockTokensData } from "sdk/test/mock";
import { createTradeFlags } from "sdk/utils/trade/trade";
import { TradeMode, TradeType } from "sdk/utils/trade/types";

const { selectorValues } = vi.hoisted(() => ({ selectorValues: new Map<string, unknown>() }));

vi.mock("context/SyntheticsStateContext/selectors/tradeboxSelectors", () => ({
  selectTradeboxToToken: "toToken",
  selectTradeboxTradeFlags: "tradeFlags",
}));

vi.mock("context/SyntheticsStateContext/selectors/tradeboxSelectors/selectTradeboxLiquidityInfo", () => ({
  selectTradeboxLiquidityInfo: "liquidityInfo",
}));

vi.mock("context/SyntheticsStateContext/utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("context/SyntheticsStateContext/utils")>()),
  useSelector: (key: string) => selectorValues.get(key),
}));

vi.mock("components/Tooltip/Tooltip", () => ({
  default: ({ handle, renderContent }: { handle: ReactNode; renderContent: () => ReactNode }) => (
    <>
      <span>{handle}</span>
      <div role="tooltip">{renderContent()}</div>
    </>
  ),
}));

import { MaxSizeRow } from "../TradeBoxRows/MaxSizeRow";

const tokensData = mockTokensData({ USDC: { balance: expandDecimals(10_000, 6) } });
const marketInfo = mockMarketsInfoData(tokensData, ["BTC-BTC-USDC"])["BTC-BTC-USDC"];
const maxSizeUsd = expandDecimals(1000, 30);

function renderRow(tradeMode: TradeMode, isSizeAboveMax: boolean, tradeType = TradeType.Swap) {
  selectorValues.set("tradeFlags", createTradeFlags(tradeType, tradeMode));
  selectorValues.set("toToken", tokensData.USDC);
  selectorValues.set("liquidityInfo", {
    shouldShowMaxSize: true,
    isSizeAboveMax,
    maxSizeUsd,
    maxSizeAmount: expandDecimals(1000, 6),
  });

  return render(<MaxSizeRow />);
}

beforeAll(() => {
  i18n.load("en", {});
  i18n.activate("en");
});

beforeEach(() => selectorValues.clear());
afterEach(cleanup);

describe("MaxSizeRow swap copy", () => {
  it.each([TradeMode.Market, TradeMode.Twap])("explains the hard liquidity limit for %s swaps", (tradeMode) => {
    renderRow(tradeMode, true);

    const displayedMaxSize = screen.getByText("1000.00 USDC").textContent;
    expect(screen.getByText("Max swap size")).toBeTruthy();
    expect(screen.getByRole("tooltip").textContent).toBe(
      `Order won't execute: size exceeds the max swap size of ${displayedMaxSize}. Reduce the swap size.`
    );
  });

  it.each([TradeMode.Market, TradeMode.Twap])("describes current liquidity below the %s swap limit", (tradeMode) => {
    renderRow(tradeMode, false);

    expect(screen.getByRole("tooltip").textContent).toBe(
      "The maximum swap size based on current liquidity. Updates live."
    );
  });

  it("keeps the minimum receive guidance for an oversized limit swap", () => {
    renderRow(TradeMode.Limit, true);

    expect(screen.getByRole("tooltip").textContent).toBe(
      "Order may not execute: insufficient liquidity to fill the swap at the min. receive amount. Edit the min. receive amount or reduce the swap size."
    );
  });

  it("describes deferred execution below the limit swap maximum", () => {
    renderRow(TradeMode.Limit, false);

    expect(screen.getByRole("tooltip").textContent).toBe("Executes when liquidity and price conditions are met");
  });
});

describe("MaxSizeRow position copy", () => {
  it.each([TradeType.Long, TradeType.Short])("matches the %s market increase button tooltip", (tradeType) => {
    const isLong = tradeType === TradeType.Long;
    const validation = getIncreaseError({
      chainId: ARBITRUM,
      marketInfo,
      indexToken: tokensData.BTC,
      initialCollateralToken: tokensData.USDC,
      initialCollateralAmount: expandDecimals(1000, 6),
      initialCollateralUsd: expandDecimals(1000, 30),
      targetCollateralToken: tokensData.USDC,
      collateralUsd: expandDecimals(1000, 30),
      sizeDeltaUsd: expandDecimals(1001, 30),
      nextPositionValues: undefined,
      existingPosition: undefined,
      fees: { payTotalFees: { deltaUsd: -expandDecimals(1, 30), bps: -10n, precisePercentage: 0n } },
      markPrice: expandDecimals(50_000, 30),
      triggerPrice: undefined,
      externalSwapQuote: undefined,
      isExternalSwapLoading: false,
      swapPathStats: undefined,
      collateralLiquidity: undefined,
      longLiquidity: isLong ? maxSizeUsd : expandDecimals(2000, 30),
      shortLiquidity: isLong ? expandDecimals(2000, 30) : maxSizeUsd,
      minCollateralUsd: expandDecimals(10, 30),
      isLong,
      isLimit: false,
      isTwap: false,
      nextLeverageWithoutPnl: undefined,
      thresholdType: undefined,
      numberOfParts: 1,
      minPositionSizeUsd: 0n,
    });

    renderRow(TradeMode.Market, true, tradeType);

    expect(validation.buttonErrorMessage).toBe(isLong ? "Max BTC long exceeded" : "Max BTC short exceeded");
    expect(screen.getByRole("tooltip").textContent).toBe(validation.buttonTooltipMessage);
  });
});
