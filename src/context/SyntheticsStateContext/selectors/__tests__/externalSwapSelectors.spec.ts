import { AVALANCHE } from "config/chains";
import { getSwapPriceImpactForExternalSwapThresholdBps } from "config/externalSwaps";
import { mockMarketsInfoData, mockTokensData } from "sdk/test/mock";
import { mockExternalSwapQuote } from "domain/synthetics/testUtils/mocks";
import { FindSwapPath } from "domain/synthetics/trade";
import { expandDecimals } from "lib/numbers";
import { DeepPartial } from "lib/types";
import { ExternalSwapQuote, SwapPathStats, TradeMode, TradeType } from "sdk/types/trade";
import { bigMath } from "sdk/utils/bigmath";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SyntheticsState } from "../../SyntheticsStateContextProvider";
import {
  selectExternalSwapInputs,
  selectExternalSwapQuote,
  selectShouldRequestExternalSwapQuote,
} from "../externalSwapSelectors";
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

describe("externalSwapSelectors", () => {
  let findSwapPathFn: FindSwapPath;

  beforeEach(() => {
    mockBaseSwapQuote = mockExternalSwapQuote({
      inTokenAddress: tokensData.ETH.address,
      outTokenAddress: tokensData.USDC.address,
      amountIn: expandDecimals(1, 18), // 1 ETH
      amountOut: expandDecimals(1795, 6), // 1800 USDC
      usdIn: expandDecimals(1800, 30),
      usdOut: expandDecimals(1795, 30),
      priceIn: expandDecimals(1800, 30),
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
      usdOut: expandDecimals(1795, 30),
      amountOut: expandDecimals(1795, 6),
    };

    defaultState = {
      pageType: "trade",
      globals: {
        chainId: AVALANCHE,
        marketsInfo: {
          marketsInfoData,
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
        isWrapOrUnwrap: false,
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
      },
      externalSwap: {
        baseOutput: mockBaseSwapQuote,
        setBaseOutput: () => undefined,
        shouldFallbackToInternalSwap: false,
        setShouldFallbackToInternalSwap: () => undefined,
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
          baseOutput: undefined,
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
      const state = createMockState({
        tradebox: {
          ...defaultState.tradebox,
          focusedInput: "to",
        },
      });

      mockSwapPathStats.totalFeesDeltaUsd = -expandDecimals(10, 30);

      const inputs = selectExternalSwapInputs(state as SyntheticsState);
      const result = selectExternalSwapQuote(state as SyntheticsState);

      expect(inputs?.strategy).toBe("leverageBySize");

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
