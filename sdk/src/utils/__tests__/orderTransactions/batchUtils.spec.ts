import { zeroAddress, zeroHash } from "viem";
import { describe, expect, it } from "vitest";

import { ARBITRUM } from "configs/chains";
import { getTokenBySymbol, getWrappedToken, NATIVE_TOKEN_ADDRESS } from "configs/tokens";
import { OrderType } from "types/orders";
import { ERC20Address } from "types/tokens";
import { ExternalSwapQuote } from "types/trade";
import { expandDecimals, parseValue, USD_DECIMALS } from "utils/numbers";
import {
  buildIncreaseOrderPayload,
  getBatchExternalCalls,
  getBatchExternalSwapGasLimit,
  getBatchIsNativePayment,
  getBatchTotalExecutionFee,
  getBatchTotalPayCollateralAmount,
  getIsEmptyBatch,
  getIsInvalidBatchReceiver,
  IncreasePositionOrderParams,
} from "utils/orderTransactions";

import { mockExternalSwap } from "../../../test/mock";

// Common tokens and addresses
const CHAIN_ID = ARBITRUM;
const ACCOUNT = "0x1234567890123456789012345678901234567890";
const WETH = getWrappedToken(CHAIN_ID);
const USDC = getTokenBySymbol(CHAIN_ID, "USDC");
const USDT = getTokenBySymbol(CHAIN_ID, "USDT");

// Common MarketIncrease params
const commonMarketIncreaseParams = {
  chainId: CHAIN_ID,
  receiver: ACCOUNT,
  executionGasLimit: 0n,
  payTokenAddress: WETH.address,
  payTokenAmount: parseValue("1", WETH.decimals)!,
  marketAddress: "0x1111111111111111111111111111111111111111",
  indexTokenAddress: WETH.address,
  isLong: true,
  sizeDeltaUsd: parseValue("1000", USD_DECIMALS)!,
  sizeDeltaInTokens: parseValue("1", WETH.decimals)!,
  acceptablePrice: parseValue("1200", USD_DECIMALS)!,
  collateralTokenAddress: WETH.address,
  collateralDeltaAmount: parseValue("1", WETH.decimals)!,
  swapPath: [WETH.address],
  externalSwapQuote: undefined as ExternalSwapQuote | undefined,
  triggerPrice: undefined,
  referralCode: zeroHash,
  autoCancel: false,
  allowedSlippage: 100,
  executionFeeAmount: parseValue("0.1", WETH.decimals)!,
  validFromTime: 0n,
  orderType: OrderType.MarketIncrease as const,
  uiFeeReceiver: zeroAddress,
} satisfies Partial<IncreasePositionOrderParams>;

// Helper to build a batch with multiple increase orders
function buildMultiIncreaseBatch(paramsList: (typeof commonMarketIncreaseParams)[]) {
  return {
    createOrderParams: paramsList.map((p) => buildIncreaseOrderPayload(p)),
    updateOrderParams: [],
    cancelOrderParams: [],
  };
}

describe("Batch Utils", () => {
  describe("getIsEmptyBatch", () => {
    it("undefined batch", () => {
      expect(getIsEmptyBatch(undefined)).toBe(true);
    });

    it("zero actions batch", () => {
      expect(getIsEmptyBatch({ createOrderParams: [], updateOrderParams: [], cancelOrderParams: [] })).toBe(true);
    });

    it("multiple orders batch with one empty order", () => {
      const emptyOrder = buildIncreaseOrderPayload({
        ...commonMarketIncreaseParams,
        payTokenAmount: 0n,
        sizeDeltaUsd: 0n,
        sizeDeltaInTokens: 0n,
        collateralDeltaAmount: 0n,
      });
      const nonEmptyOrder = buildIncreaseOrderPayload(commonMarketIncreaseParams);
      const batch = {
        createOrderParams: [emptyOrder, nonEmptyOrder],
        updateOrderParams: [],
        cancelOrderParams: [],
      };
      expect(getIsEmptyBatch(batch)).toBe(true);
    });

    it("multiple non-empty orders batch", () => {
      const batch = buildMultiIncreaseBatch([commonMarketIncreaseParams, commonMarketIncreaseParams]);
      expect(getIsEmptyBatch(batch)).toBe(false);
    });
  });

  describe("getBatchIsNativePayment", () => {
    it("returns true if any order has native payment", () => {
      const nativeParams = { ...commonMarketIncreaseParams, payTokenAddress: NATIVE_TOKEN_ADDRESS };
      const batch = buildMultiIncreaseBatch([nativeParams]);
      expect(getBatchIsNativePayment(batch)).toBe(true);
    });

    it("returns false if no orders have native payment", () => {
      const batch = buildMultiIncreaseBatch([commonMarketIncreaseParams]);
      expect(getBatchIsNativePayment(batch)).toBe(false);
    });
  });

  describe("getIsInvalidBatchReceiver", () => {
    it("returns true if orders have different receivers", () => {
      const params1 = { ...commonMarketIncreaseParams, receiver: ACCOUNT };
      const params2 = {
        ...commonMarketIncreaseParams,
        receiver: "0x9999999999999999999999999999999999999999",
      };

      const batch = buildMultiIncreaseBatch([params1, params2]);
      expect(getIsInvalidBatchReceiver(batch, ACCOUNT)).toBe(true);
    });

    it("returns false if all orders have the same receiver", () => {
      const batch = buildMultiIncreaseBatch([commonMarketIncreaseParams, commonMarketIncreaseParams]);
      expect(getIsInvalidBatchReceiver(batch, ACCOUNT)).toBe(false);
    });
  });

  describe("getBatchExternalCalls", () => {
    it("combines external calls from multiple orders", () => {
      const params1 = {
        ...commonMarketIncreaseParams,
        payTokenAddress: WETH.address as ERC20Address,
        payTokenAmount: parseValue("1", WETH.decimals)!,
        externalSwapQuote: mockExternalSwap({
          inToken: WETH,
          outToken: USDC,
          to: "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64",
          data: "0x1",
          amountIn: parseValue("1", WETH.decimals)!,
          amountOut: parseValue("1000", USDC.decimals)!,
          priceIn: expandDecimals(1000, USD_DECIMALS),
          priceOut: expandDecimals(1, USD_DECIMALS),
        }),
      };
      const params2 = {
        ...commonMarketIncreaseParams,
        payTokenAddress: USDC.address as ERC20Address,
        payTokenAmount: parseValue("1000", USDC.decimals)!,
        externalSwapQuote: mockExternalSwap({
          inToken: USDC,
          outToken: WETH,
          to: "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64",
          data: "0x2",
          amountIn: parseValue("1000", USDC.decimals)!,
          amountOut: parseValue("0.5", WETH.decimals)!,
          priceIn: expandDecimals(1, USD_DECIMALS),
          priceOut: expandDecimals(2000, USD_DECIMALS),
        }),
      };
      const batch = buildMultiIncreaseBatch([params1, params2]);

      const result = getBatchExternalCalls(batch);

      expect(result).toEqual({
        sendTokens: [WETH.address, USDC.address],
        sendAmounts: [parseValue("1", WETH.decimals)!, parseValue("1000", USDC.decimals)!],
        externalCallTargets: [
          "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64",
          "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64",
        ],
        externalCallDataList: ["0x1", "0x2"],
        refundTokens: [WETH.address, USDC.address],
        refundReceivers: [ACCOUNT, ACCOUNT],
      });
    });
  });

  describe("getBatchTotalPayCollateralAmount", () => {
    it("sums pay amounts across orders", () => {
      const params1 = {
        ...commonMarketIncreaseParams,
        externalSwapQuote: undefined,
        payTokenAmount: parseValue("1", WETH.decimals)!,
      };

      const params2 = {
        ...commonMarketIncreaseParams,
        externalSwapQuote: undefined,
        payTokenAmount: parseValue("2", WETH.decimals)!,
      };

      const params3 = {
        ...commonMarketIncreaseParams,
        externalSwapQuote: undefined,
        payTokenAddress: USDC.address as ERC20Address,
        payTokenAmount: parseValue("3", USDC.decimals)!,
      };

      const batch = buildMultiIncreaseBatch([params1, params2, params3]);
      const result = getBatchTotalPayCollateralAmount(batch);

      expect(result).toEqual({
        [WETH.address]: parseValue("3", WETH.decimals)!,
        [USDC.address]: parseValue("3", USDC.decimals)!,
      });
    });
  });

  describe("getBatchTotalExecutionFee", () => {
    it("calculates total execution fee including top-ups", () => {
      const params5 = {
        ...commonMarketIncreaseParams,
        externalSwapQuote: undefined,
        executionFeeAmount: parseValue("0.1", WETH.decimals)!,
      };

      const batch = buildMultiIncreaseBatch([params5]);

      batch.updateOrderParams = [{ updatePayload: { executionFeeTopUp: parseValue("0.05", WETH.decimals)! } }] as any;

      const tokensData = {
        [WETH.address]: {
          ...WETH,
          prices: {
            minPrice: expandDecimals(2000, USD_DECIMALS),
            maxPrice: expandDecimals(2000, USD_DECIMALS),
          },
        },
      };

      const result = getBatchTotalExecutionFee({ batchParams: batch, tokensData, chainId: CHAIN_ID });

      expect(result).toEqual({
        feeTokenAmount: parseValue("0.15", WETH.decimals)!,
        gasLimit: 0n,
        feeUsd: expandDecimals(300, USD_DECIMALS),
        feeToken: tokensData[WETH.address],
        isFeeHigh: true,
        isFeeVeryHigh: true,
      });
    });
  });

  describe("getBatchExternalSwapGasLimit", () => {
    it("sums gas limits from external swap quotes", () => {
      const quote1 = mockExternalSwap({
        inToken: WETH,
        outToken: USDC,
        amountIn: parseValue("1", WETH.decimals)!,
        amountOut: parseValue("1000", USDC.decimals)!,
        priceIn: expandDecimals(1000, USD_DECIMALS),
        priceOut: expandDecimals(1, USD_DECIMALS),
      });
      const quote2 = mockExternalSwap({
        inToken: USDC,
        outToken: USDT,
        amountIn: parseValue("1000", USDC.decimals)!,
        amountOut: parseValue("1000", USDT.decimals)!,
        priceIn: expandDecimals(1, USD_DECIMALS),
        priceOut: expandDecimals(1, USD_DECIMALS),
      });
      const params6 = {
        ...commonMarketIncreaseParams,
        externalSwapQuote: quote1,
      };
      const params7 = {
        ...commonMarketIncreaseParams,
        externalSwapQuote: quote2,
        payTokenAddress: USDC.address,
      };
      const batch = buildMultiIncreaseBatch([params6, params7]);
      const result = getBatchExternalSwapGasLimit(batch);
      expect(result).toBe(quote1.txnData.estimatedGas + quote2.txnData.estimatedGas);
    });
  });
});
