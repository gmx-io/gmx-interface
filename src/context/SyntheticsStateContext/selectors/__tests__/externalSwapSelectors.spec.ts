import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AVALANCHE } from "config/chains";
import { getSwapPriceImpactForExternalSwapThresholdBps } from "config/externalSwaps";
import { ExternalSwapRequestResult } from "domain/synthetics/externalSwaps/types";
import { getExternalSwapRequestKey } from "domain/synthetics/externalSwaps/utils";
import { mockExternalSwapQuote } from "domain/synthetics/testUtils/mocks";
import { FindSwapPath } from "domain/synthetics/trade";
import { expandDecimals } from "lib/numbers";
import { DeepPartial } from "lib/types";
import { mockMarketsInfoData, mockTokensData } from "sdk/test/mock";
import { bigMath } from "sdk/utils/bigmath";
import { ExternalSwapQuote, SwapPathStats, TradeMode, TradeType } from "sdk/utils/trade/types";

import { SyntheticsState } from "../../SyntheticsStateContextProvider";
import {
  selectExternalSwapInputs,
  selectExternalSwapQuote,
  selectShouldRequestExternalSwapQuote,
} from "../tradeboxSelectors";
import * as tradeSelectors from "../tradeSelectors";

const marketKey = "ETH-ETH-USDC";
const tokensData = mockTokensData();
const marketsInfoData = mockMarketsInfoData(tokensData, [marketKey]);

const swapPriceImpactForExternalSwapThresholdBps = getSwapPriceImpactForExternalSwapThresholdBps();

let mockBaseSwapQuote: ExternalSwapQuote;
let mockSwapPathStats: SwapPathStats;
let defaultState: DeepPartial<SyntheticsState>;

const createMockState = (overrides: DeepPartial<SyntheticsState> = {}): SyntheticsState =>
  ({
    ...defaultState,
    ...overrides,
  }) as SyntheticsState;

function buildSuccessResult(
  quote: ExternalSwapQuote,
  fromTokenAmount: bigint,
  slippage: number
): ExternalSwapRequestResult {
  const key = getExternalSwapRequestKey({
    fromTokenAddress: quote.inTokenAddress,
    toTokenAddress: quote.outTokenAddress,
    strategy: "byFromValue",
    amountIn: fromTokenAmount,
    desiredAmountOut: undefined,
    slippage,
  })!;
  return { status: "success", key, quote };
}

const DEFAULT_SLIPPAGE = 50;

describe("externalSwapSelectors", () => {
  let findSwapPathFn: FindSwapPath;

  beforeEach(() => {
    mockBaseSwapQuote = mockExternalSwapQuote({
      inTokenAddress: tokensData.ETH.address,
      outTokenAddress: tokensData.USDC.address,
      amountIn: expandDecimals(1, 18), // 1 ETH
      amountOut: expandDecimals(1195, 6), // 1195 USDC
      usdIn: expandDecimals(1200, 30),
      usdOut: expandDecimals(1195, 30),
      priceIn: expandDecimals(1200, 30),
      priceOut: expandDecimals(1, 30),
      feesUsd: expandDecimals(5, 30),
    });

    mockSwapPathStats = {
      swapPath: [],
      swapSteps: [],
      tokenInAddress: tokensData.ETH.address,
      tokenOutAddress: tokensData.USDC.address,
      totalSwapFeeUsd: expandDecimals(-1, 30),
      totalSwapPriceImpactDeltaUsd: expandDecimals(-1, 29),
      totalFeesDeltaUsd: expandDecimals(-11, 29),
      usdOut: expandDecimals(1195, 30),
      amountOut: expandDecimals(1195, 6),
    };

    defaultState = {
      pageType: "trade",
      globals: {
        chainId: AVALANCHE,
        marketsInfo: {
          marketsInfoData,
        },
        tokensDataResult: {
          tokensData,
        },
        positionsInfo: {
          positionsInfoData: {},
        },
        uiFeeFactor: 0n,
      },
      tradebox: {
        tradeType: TradeType.Long,
        tradeMode: TradeMode.Market,
        fromTokenAddress: tokensData.ETH.address,
        toTokenAddress: tokensData.USDC.address,
        marketAddress: marketsInfoData[marketKey].marketTokenAddress,
        marketInfo: marketsInfoData[marketKey],
        collateralAddress: tokensData.USDC.address,
        collateralToken: tokensData.USDC,
        fromTokenInputValue: "1",
        toTokenInputValue: "1800",
        focusedInput: "from",
        leverageOption: 2,
        allowedSlippage: DEFAULT_SLIPPAGE,
      },
      externalSwap: {
        requestResult: buildSuccessResult(mockBaseSwapQuote, expandDecimals(1, 18), DEFAULT_SLIPPAGE),
        setRequestResult: () => undefined,
        shouldFallbackToInternalSwap: false,
        shouldForceExternalSwap: false,
        setShouldFallbackToInternalSwap: () => undefined,
        setShouldForceExternalSwap: () => undefined,
      },
      settings: {
        showDebugValues: false,
        externalSwapsEnabled: true,
        isLeverageSliderEnabled: true,
      },
    };

    findSwapPathFn = vi.fn().mockReturnValue(mockSwapPathStats);

    vi.spyOn(tradeSelectors, "makeSelectFindSwapPath").mockImplementation(() => () => findSwapPathFn);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("selectExternalSwapQuote", () => {
    it("should return undefined when required inputs are missing", () => {
      const state = createMockState({
        externalSwap: {
          ...defaultState.externalSwap,
          requestResult: undefined,
        },
      });

      const result = selectExternalSwapQuote(state as SyntheticsState);
      expect(result).toBeUndefined();
    });

    it("should return undefined shouldFallbackToInternalSwap is true ", () => {
      const state = createMockState({
        externalSwap: {
          ...defaultState.externalSwap,
          shouldFallbackToInternalSwap: true,
        },
      });
      const result = selectExternalSwapQuote(state as SyntheticsState);
      expect(result).toEqual(undefined);
    });

    it("should return undefined when internal swap fees is better ", () => {
      const state = createMockState();
      const inputs = selectExternalSwapInputs(state as SyntheticsState);
      const result = selectExternalSwapQuote(state as SyntheticsState);

      expect(inputs?.internalSwapTotalFeesDeltaUsd).toBeLessThan(mockBaseSwapQuote.feesUsd);
      expect(inputs?.internalSwapTotalFeesDeltaUsd).toEqual(mockSwapPathStats.totalFeesDeltaUsd);
      expect(result).toEqual(undefined);
    });

    it("should calculate quote correctly with base output", () => {
      const state = createMockState();

      mockSwapPathStats.totalFeesDeltaUsd = -expandDecimals(10, 30);

      const result = selectExternalSwapQuote(state as SyntheticsState);
      expect(result).toEqual(mockBaseSwapQuote);
    });

    it("should recalculate amountIn and usdIn for leverageBySize strategy", () => {
      mockSwapPathStats.totalFeesDeltaUsd = -expandDecimals(10, 30);

      const inputsState = createMockState({
        tradebox: {
          ...defaultState.tradebox,
          focusedInput: "to",
        },
      });
      const inputs = selectExternalSwapInputs(inputsState as SyntheticsState);
      expect(inputs?.strategy).toBe("leverageBySize");

      // Align baseOutput.amountIn with the strategy's required amountIn so the quote is not
      // filtered as stale. Rescaling still fires because inputs.usdOut diverges from
      // baseOutput.usdOut (oracle vs KyberSwap price).
      mockBaseSwapQuote.amountIn = inputs!.amountIn;
      mockBaseSwapQuote.usdIn = bigMath.mulDiv(inputs!.amountIn, mockBaseSwapQuote.priceIn, expandDecimals(1, 18));

      const key = getExternalSwapRequestKey({
        fromTokenAddress: mockBaseSwapQuote.inTokenAddress,
        toTokenAddress: mockBaseSwapQuote.outTokenAddress,
        strategy: "leverageBySize",
        amountIn: inputs!.amountIn,
        desiredAmountOut: undefined,
        slippage: DEFAULT_SLIPPAGE,
      })!;

      const state = createMockState({
        tradebox: {
          ...defaultState.tradebox,
          focusedInput: "to",
        },
        externalSwap: {
          ...defaultState.externalSwap,
          requestResult: { status: "success", key, quote: mockBaseSwapQuote },
        },
      });

      const result = selectExternalSwapQuote(state as SyntheticsState);

      const expectedUsdIn = (mockBaseSwapQuote.usdIn * inputs!.usdOut) / mockBaseSwapQuote.usdOut;
      const expectedAmountIn = bigMath.mulDiv(expectedUsdIn, expandDecimals(1, 18), mockBaseSwapQuote.priceIn);

      expect(result?.usdIn).toBe(expectedUsdIn);
      expect(result?.amountIn).toBe(expectedAmountIn);
    });
  });

  describe("selectShouldRequestExternalSwapQuote", () => {
    it("should return false if internal swap fees are less than threshold", () => {
      const state = createMockState();
      const result = selectShouldRequestExternalSwapQuote(state);
      const inputs = selectExternalSwapInputs(state);
      // negative bps should be greater than threshold
      expect(inputs?.internalSwapTotalFeeItem?.bps).toBeGreaterThan(swapPriceImpactForExternalSwapThresholdBps);
      expect(inputs?.internalSwapTotalFeeItem?.bps).toEqual(-9n);
      expect(result).toBe(false);
    });

    it("should return false when external swaps are disabled", () => {
      const state = createMockState({
        settings: {
          ...defaultState.settings,
          externalSwapsEnabled: false,
        },
      });
      const result = selectShouldRequestExternalSwapQuote(state);
      expect(result).toBe(false);
    });

    it("should return true when external swaps are enabled and conditions are met", () => {
      const state = createMockState();
      mockSwapPathStats.totalFeesDeltaUsd = -expandDecimals(10, 30);

      const result = selectShouldRequestExternalSwapQuote(state);
      const inputs = selectExternalSwapInputs(state);

      // negative bps should be less than threshold
      expect(inputs?.internalSwapTotalFeeItem?.bps).toBeLessThan(swapPriceImpactForExternalSwapThresholdBps);
      expect(inputs?.internalSwapTotalFeeItem?.bps).toEqual(-83n);
      expect(result).toBe(true);
    });
  });

  describe("selectExternalSwapInputs", () => {
    it("should return undefined when swap is not needed", () => {
      const state = createMockState({
        tradebox: {
          ...defaultState.tradebox,
          fromTokenAddress: tokensData.USDC.address,
        },
      });
      const result = selectExternalSwapInputs(state);
      expect(result).toBeUndefined();
      expect(findSwapPathFn).not.toHaveBeenCalled();
    });

    it("should calculate swap inputs correctly", () => {
      const state = createMockState();
      const result = selectExternalSwapInputs(state);

      expect(result).toBeDefined();
      expect(result?.strategy).toBe("byFromValue");
      expect(result?.internalSwapTotalFeesDeltaUsd).toBe(mockSwapPathStats.totalFeesDeltaUsd);
      expect(findSwapPathFn).toHaveBeenCalled();

      expect(vi.mocked(tradeSelectors.makeSelectFindSwapPath)).toHaveBeenCalledWith(
        tokensData.ETH.address,
        tokensData.USDC.address
      );
    });
  });
});
