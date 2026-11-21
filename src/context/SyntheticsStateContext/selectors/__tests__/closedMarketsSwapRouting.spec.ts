import { describe, expect, it } from "vitest";

import type { SyntheticsState } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { createMockMarketInfo, MOCK_MARKET_ADDRESS } from "domain/testUtils/mockMarketInfo";
import { createMockSyntheticsState, type MockSyntheticsStateOverrides } from "domain/testUtils/mockSyntheticsState";
import { ETH_ADDRESS, ETH_TOKEN, USDC_ADDRESS, USDC_TOKEN } from "domain/testUtils/mockTokens";
import { expandDecimals } from "lib/numbers";
import type { TokenData } from "sdk/utils/tokens/types";
import { TradeMode, TradeType } from "sdk/utils/trade/types";

import { selectTradeboxIncreasePositionAmounts, selectTradeboxSwapAmounts } from "../tradeboxSelectors";
import { makeSelectFindSwapPath, makeSelectMaxLiquidityPath } from "../tradeSelectors";

const GOLD_MARKET_ADDRESS = "0x0Df2BE76F517BCF0000AbfFcB6344B3b2aC4Cc4f";
const GOLD_TOKEN = {
  ...ETH_TOKEN,
  address: "0xc48d782c5C54157d37d2Fa4E6BA27E8cf57Da956",
  symbol: "GOLD",
  name: "Gold",
  isSynthetic: true,
  prices: { minPrice: expandDecimals(4000, 30), maxPrice: expandDecimals(4000, 30) },
} as TokenData;

const ethMarket = createMockMarketInfo();
// GOLD/USD [WETH-USDC] holds more USDC, so it is the better pool for WETH → USDC while it is open
const goldMarket = createMockMarketInfo(GOLD_TOKEN, {
  marketTokenAddress: GOLD_MARKET_ADDRESS,
  indexTokenAddress: GOLD_TOKEN.address,
  longTokenAddress: ETH_ADDRESS,
  longToken: ETH_TOKEN,
  name: "GOLD/USD [WETH-USDC]",
  shortPoolAmount: expandDecimals(4_000_000, 6),
  maxShortPoolAmount: expandDecimals(40_000_000, 6),
});
const tokensData = { [ETH_ADDRESS]: ETH_TOKEN, [USDC_ADDRESS]: USDC_TOKEN, [GOLD_TOKEN.address]: GOLD_TOKEN };

function createState(closedMarkets: string[] | undefined, overrides: MockSyntheticsStateOverrides = {}) {
  const state = createMockSyntheticsState({ tokensData, ...overrides });

  return {
    ...state,
    globals: {
      ...state.globals,
      marketsInfo: {
        ...state.globals.marketsInfo,
        marketsInfoData: { [MOCK_MARKET_ADDRESS]: ethMarket, [GOLD_MARKET_ADDRESS]: goldMarket },
      },
      closedMarkets: closedMarkets && Object.fromEntries(closedMarkets.map((address) => [address, true as const])),
    },
  } as SyntheticsState;
}

const swapWethForUsdc: MockSyntheticsStateOverrides = {
  tradeType: TradeType.Swap,
  fromTokenAddress: ETH_ADDRESS,
  toTokenAddress: USDC_ADDRESS,
  collateralAddress: USDC_ADDRESS,
  fromTokenInputValue: "5",
};

const shortPaidInWeth: MockSyntheticsStateOverrides = {
  tradeType: TradeType.Short,
  marketInfo: ethMarket,
  fromTokenAddress: ETH_ADDRESS,
  toTokenAddress: ETH_ADDRESS,
  collateralAddress: USDC_ADDRESS,
  leverageOption: 2,
  fromTokenInputValue: "5",
};

const ROUTES: [string, (closedMarkets: string[] | undefined) => string[] | undefined][] = [
  ["market swap", (closed) => selectTradeboxSwapAmounts(createState(closed, swapWethForUsdc))?.swapStrategy.swapPathStats?.swapPath],
  [
    "limit swap",
    (closed) =>
      selectTradeboxSwapAmounts(
        createState(closed, { ...swapWethForUsdc, tradeMode: TradeMode.Limit, triggerPriceInputValue: "2000" })
      )?.swapStrategy.swapPathStats?.swapPath,
  ],
  [
    "increase paid with a swap",
    (closed) =>
      selectTradeboxIncreasePositionAmounts(createState(closed, shortPaidInWeth))?.swapStrategy.swapPathStats?.swapPath,
  ],
  [
    "decrease receive swap, deposit and withdrawal swaps",
    (closed) => makeSelectFindSwapPath(ETH_ADDRESS, USDC_ADDRESS)(createState(closed))(expandDecimals(10_000, 30))?.swapPath,
  ],
  ["max liquidity route", (closed) => makeSelectMaxLiquidityPath(ETH_ADDRESS, USDC_ADDRESS)(createState(closed)).maxLiquidityPath],
];

describe("swap routing and markets the keeper reports closed", () => {
  it.each(ROUTES)("%s skips the pool of a closed market and takes it again once it reopens TRD-149", (_, getRoute) => {
    expect(getRoute([])).toEqual([GOLD_MARKET_ADDRESS]);
    expect(getRoute(undefined)).toEqual([GOLD_MARKET_ADDRESS]);
    expect(getRoute([GOLD_MARKET_ADDRESS])).toEqual([MOCK_MARKET_ADDRESS]);
    expect(getRoute([])).toEqual([GOLD_MARKET_ADDRESS]);
  });
});
