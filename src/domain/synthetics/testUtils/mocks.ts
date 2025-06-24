import { expect } from "vitest";

import { AVALANCHE } from "config/chains";
import { MarketInfo, MarketsInfoData, getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import { convertToTokenAmount, getTokenData } from "domain/synthetics/tokens/utils";
import { getTokenBySymbol } from "sdk/configs/tokens";
import type { PositionInfo } from "sdk/types/positions";
import { bigMath } from "sdk/utils/bigmath";
import { getLeverage } from "sdk/utils/positions";

import { getPositionKey } from "../positions";
import { ExternalSwapAggregator, ExternalSwapQuote, FindSwapPath, getMarkPrice, SwapPathStats } from "../trade";
import { MOCK_GAS_PRICE, mockMarketKeys, mockMarketsInfoData, mockTokensData } from "sdk/test/mock";
import { GlobalExpressParams } from "../express";
import { expandDecimals } from "sdk/utils/numbers";
import { findSwapPathsBetweenTokens } from "sdk/utils/swap/findSwapPathsBetweenTokens";
import { TokenData } from "domain/tokens";
import { buildMarketsAdjacencyGraph } from "sdk/utils/swap/buildMarketsAdjacencyGraph";
import {
  SwapPathStats,
  SwapStep
} from "../trade/types";
import {
  FindSwapPath
} from "../trade";

export function mockPositionInfo(
  {
    marketInfo,
    collateralTokenAddress,
    account,
    isLong,
    sizeInUsd,
    collateralUsd,
  }: {
    marketInfo: MarketInfo;
    collateralTokenAddress: string;
    account: string;
    sizeInUsd: bigint;
    collateralUsd: bigint;
    isLong: boolean;
  },
  overrides: Partial<PositionInfo> = {}
): PositionInfo {
  const collateralToken =
    collateralTokenAddress === marketInfo.longToken.address ? marketInfo.longToken : marketInfo.shortToken;

  const collateralAmount = convertToTokenAmount(
    collateralUsd,
    collateralToken.decimals,
    collateralToken.prices?.minPrice
  )!;

  const posiionKey = getPositionKey(account, marketInfo.marketTokenAddress, collateralTokenAddress, isLong);

  return {
    data: "",
    key: posiionKey,
    contractKey: posiionKey + "contractKey",
    account: account,
    marketAddress: marketInfo.marketTokenAddress,
    collateralTokenAddress,
    sizeInUsd,
    sizeInTokens: convertToTokenAmount(
      sizeInUsd,
      marketInfo.indexToken.decimals,
      marketInfo.indexToken.prices?.minPrice
    )!,
    collateralAmount: convertToTokenAmount(collateralUsd, collateralToken.decimals, collateralToken.prices?.minPrice)!,
    increasedAtTime: BigInt((Date.now() / 1000) >> 0),
    decreasedAtTime: BigInt((Date.now() / 1000) >> 0),
    isLong: true,
    pendingBorrowingFeesUsd: 0n,
    fundingFeeAmount: 0n,
    claimableLongTokenAmount: 0n,
    claimableShortTokenAmount: 0n,
    marketInfo,
    market: marketInfo,
    longToken: marketInfo.longToken,
    shortToken: marketInfo.shortToken,
    indexName: getMarketIndexName(marketInfo),
    poolName: getMarketPoolName(marketInfo),
    indexToken: marketInfo.indexToken,
    collateralToken,
    pnlToken: marketInfo.longToken,
    markPrice: getMarkPrice({ prices: marketInfo.indexToken.prices, isIncrease: false, isLong }),
    entryPrice: getMarkPrice({ prices: marketInfo.indexToken.prices, isIncrease: false, isLong }),
    liquidationPrice: getMarkPrice({ prices: marketInfo.indexToken.prices, isIncrease: false, isLong }),
    collateralUsd,
    remainingCollateralUsd: collateralUsd,
    remainingCollateralAmount: collateralAmount,
    hasLowCollateral: false,
    leverage: getLeverage({
      sizeInUsd,
      collateralUsd,
      pnl: 0n,
      pendingFundingFeesUsd: 0n,
      pendingBorrowingFeesUsd: 0n,
    }),
    leverageWithPnl: 0n,
    pnl: 0n,
    pnlPercentage: 0n,
    pnlAfterFees: 0n,
    pnlAfterFeesPercentage: 0n,
    netValue: 0n,
    closingFeeUsd: 0n,
    uiFeeUsd: 0n,
    pendingFundingFeesUsd: 0n,
    pendingClaimableFundingFeesUsd: 0n,
    positionFeeAmount: 0n,
    traderDiscountAmount: 0n,
    uiFeeAmount: 0n,
    ...overrides,
  };
}

export const MOCK_TXN_DATA = {
  to: "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64",
  data: "0xabcd",
  value: 0n,
  estimatedGas: 100000n,
};

export function mockExternalSwapQuote(overrides: Partial<ExternalSwapQuote> = {}): ExternalSwapQuote {
  return {
    aggregator: ExternalSwapAggregator.OpenOcean,
    inTokenAddress: getTokenBySymbol(AVALANCHE, "BTC").address,
    outTokenAddress: getTokenBySymbol(AVALANCHE, "USDC").address,
    receiver: "0x1234567890123456789012345678901234567890",
    amountIn: 1000000n,
    amountOut: 900000n,
    usdIn: 1000000n,
    usdOut: 900000n,
    priceIn: 1000000n,
    priceOut: 900000n,
    feesUsd: 100000n,
    needSpenderApproval: false,
    txnData: {
      ...MOCK_TXN_DATA,
      estimatedExecutionFee: 100000n,
    },
    ...overrides,
  };
}

export function expectEqualWithPrecision(
  expected: bigint,
  actual: bigint,
  precision = 1_000_000n // min significant diff is 0.0000001% of expected value
) {
  const diff = bigMath.abs(actual - expected);

  if (diff === 0n) {
    return;
  }

  const diffPrecision = (diff * (precision * 1000n)) / expected;

  expect(diffPrecision).toBeLessThanOrEqual(1n);
}

export function mockSwapPathStats(params: {
  fromToken: TokenData;
  toToken: TokenData;
  marketsInfoData: MarketsInfoData;
  usdOut ? : bigint;
}): SwapPathStats {
  const marketAdjacencyGraph = buildMarketsAdjacencyGraph(params.marketsInfoData);
  const swapPaths = findSwapPathsBetweenTokens(marketAdjacencyGraph);
  const swapPath = swapPaths[params.fromToken.address]?.[params.toToken.address]?.[0];

  if (!swapPath) {
    throw new Error(
      `No swap path found between ${params.fromToken.symbol} and ${params.toToken.symbol}`
    );
  }

  const swapSteps: SwapStep[] = [];
  let currentTokenInAddress = params.fromToken.address;

  for (const marketAddress of swapPath) {
    const marketInfo = params.marketsInfoData.find(
      (market) => market.marketTokenAddress === marketAddress
    );

    if (!marketInfo) {
      throw new Error(`Market info not found for ${marketAddress}`);
    }

    const tokenOutAddress =
      currentTokenInAddress === marketInfo.longTokenAddress ?
      marketInfo.shortTokenAddress :
      marketInfo.longTokenAddress;

    swapSteps.push({
      marketAddress,
      tokenInAddress: currentTokenInAddress,
      tokenOutAddress,
    });

    currentTokenInAddress = tokenOutAddress;
  }

  const amountOut =
    params.usdOut && params.toToken.prices ?
    convertToTokenAmount(
      params.usdOut,
      params.toToken.decimals,
      params.toToken.prices.minPrice
    ) :
    0n;

  return {
    swapPath,
    swapSteps,
    amountOut,
    targetMarketAddress: undefined,
    totalSwapPriceImpactDeltaUsd: 0n,
    totalSwapFeeUsd: 0n,
    totalFeesDeltaUsd: 0n,
    tokenInAddress: params.fromToken.address,
    tokenOutAddress: params.toToken.address,
    usdOut: params.usdOut || 0n,
  };
}

export function mockFindSwapPath(
  marketsInfoData: MarketsInfoData,
  fromToken: TokenData,
  toToken: TokenData
): FindSwapPath {
 (usdIn, {
    order = ["liquidity", "length"]
  } = {}) => {
    try {
      return mockSwapPathStats({
        fromToken,
        toToken,
        marketsInfoData,
        usdOut: usdIn,
      });
    } catch (e) {
      return undefined;
    }
  };
}

export function mockGlobalExpressParams(
  overrides: Partial<GlobalExpressParams> = {},
  params: { 
    gasPaymentTokenAllowance?: bigint
    findSwapPathMock?: FindSwapPath
   } = {}
): GlobalExpressParams {
  const tokensData = mockTokensData();
  const marketKeys = mockMarketKeys();
  const marketsInfoData = mockMarketsInfoData(tokensData, marketKeys);
  const gasPaymentToken = getTokenData(tokensData, "USDC")!;
  const relayerFeeToken = getTokenData(tokensData, "AVAX")!;

  const defaultValues: GlobalExpressParams = {
    tokensData,
    marketsInfoData,
    subaccount: undefined,
    tokenPermits: [],
    gasPaymentTokenAddress: gasPaymentToken.address,
    relayerFeeTokenAddress: relayerFeeToken.address,
    gasPaymentToken,
    relayerFeeToken,
    findFeeSwapPath: params.findSwapPathMock ?? ,
    gasPrice: MOCK_GAS_PRICE,
    gasPaymentAllowanceData: {
      [gasPaymentToken.address]: params.gasPaymentTokenAllowance ?? expandDecimals(1000, gasPaymentToken.decimals),
    },
    gasLimits: {
      deposit: 500000n,
      withdrawal: 500000n,
      singleSwap: 600000n,
      createOrder: 700000n,
      updateOrder: 400000n,
      cancelOrder: 300000n,
      approve: 100000n,
      sendToken: 120000n,
    },
    l1Reference: undefined,
    bufferBps: 500, // 5%
    isSponsoredCall: false,
    noncesData: {
      userNonce: 0n,
      subaccountNonce: 0n,
    },
    ...overrides,
  };

  return defaultValues;
}
