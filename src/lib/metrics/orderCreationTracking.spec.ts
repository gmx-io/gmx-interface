import { afterEach, describe, expect, it, vi } from "vitest";

import type { EventLogData, OrderCreatedEventData } from "context/SyntheticsEvents";
import type {
  RawCreateDepositParams,
  RawCreateGlvWithdrawalParams,
  RawCreateWithdrawalParams,
} from "domain/synthetics/markets";
import { ARBITRUM } from "sdk/configs/chains";
import { getTokenBySymbol } from "sdk/configs/tokens";
import { DecreasePositionSwapType, OrderType } from "sdk/utils/orders/types";
import {
  buildIncreaseOrderPayload,
  buildTwapOrdersPayloads,
  CreateOrderPayload,
  IncreasePositionOrderParams,
} from "sdk/utils/orderTransactions";
import type { ERC20Address } from "sdk/utils/tokens/types";

import { metrics } from "./Metrics";
import {
  getDepositCreationKey,
  getOrderCreationKey,
  getWithdrawalCreationKey,
  initGLVSwapMetricData,
  initGMSwapMetricData,
  initIncreaseOrderMetricData,
  sendTrackedOrderCancelledMetric,
  sendTrackedOrderCreatedMetric,
  sendTrackedOrderExecutedMetric,
  sendTxnErrorMetric,
  sendTxnSentMetric,
} from "./utils";

const ACCOUNT = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const ETH_USD_MARKET = "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336";
const GLV_WETH_USDC = "0x528A5bac7E746C9A509A1f4F6dF58A03d44279F9";
const WETH = getTokenBySymbol(ARBITRUM, "WETH").address as ERC20Address;
const USDC = getTokenBySymbol(ARBITRUM, "USDC").address as ERC20Address;

const cancelledEvent = {
  stringItems: { items: { reason: "MinMarketTokens" }, arrayItems: {} },
} as unknown as EventLogData;

let orderKeyNonce = 0;

afterEach(() => {
  vi.restoreAllMocks();
});

function getIncreaseParams(sizeDeltaUsd: bigint): IncreasePositionOrderParams {
  return {
    chainId: ARBITRUM,
    receiver: ACCOUNT,
    executionFeeAmount: 200_000_000_000_000n,
    executionGasLimit: 5_000_000n,
    referralCode: undefined,
    uiFeeReceiver: undefined,
    allowedSlippage: 30,
    autoCancel: false,
    validFromTime: 0n,
    payTokenAddress: USDC,
    payTokenAmount: 100_000_000n,
    swapPath: [],
    collateralDeltaAmount: 100_000_000n,
    collateralTokenAddress: USDC,
    externalSwapQuote: undefined,
    orderType: OrderType.MarketIncrease,
    marketAddress: ETH_USD_MARKET,
    indexTokenAddress: WETH,
    isLong: true,
    sizeDeltaUsd,
    sizeDeltaInTokens: 1n,
    acceptablePrice: 3_000n * 10n ** 30n,
    triggerPrice: undefined,
  };
}

function initIncrease(orderPayloads: CreateOrderPayload[]) {
  return initIncreaseOrderMetricData({
    fromToken: undefined,
    increaseAmounts: undefined,
    orderPayloads,
    initialCollateralAllowance: undefined,
    leverage: undefined,
    executionFee: undefined,
    orderType: orderPayloads[0].orderType,
    allowedSlippage: undefined,
    hasReferralCode: false,
    hasExistingPosition: undefined,
    triggerPrice: undefined,
    marketInfo: undefined,
    subaccount: undefined,
    isLong: true,
    isFirstOrder: undefined,
    isLeverageEnabled: undefined,
    isTPSLCreated: undefined,
    slCount: undefined,
    tpCount: undefined,
    priceImpactDeltaUsd: undefined,
    priceImpactPercentage: undefined,
    netRate1h: undefined,
    isExpress: true,
    isTwap: orderPayloads.length > 1,
    interactionId: undefined,
    duration: undefined,
    executionFeeBufferBps: undefined,
    partsCount: undefined,
    tradeMode: undefined,
    expressParams: undefined,
    asyncExpressParams: undefined,
    fastExpressParams: undefined,
    chainId: ARBITRUM,
    isCollateralFromMultichain: false,
  });
}

// OrderCreated carries the order params as sent, except initialCollateralDeltaAmount of increase and swap orders:
// the contract records what reached the order vault, which an external swap changes
function getOrderCreatedEvent(
  payload: CreateOrderPayload,
  initialCollateralDeltaAmount = payload.numbers.initialCollateralDeltaAmount
): Parameters<typeof getOrderCreationKey>[0] & Pick<OrderCreatedEventData, "key"> {
  return {
    key: `0x${(++orderKeyNonce).toString(16).padStart(64, "0")}`,
    orderType: payload.orderType,
    marketAddress: payload.addresses.market,
    initialCollateralTokenAddress: payload.addresses.initialCollateralToken,
    swapPath: payload.addresses.swapPath,
    isLong: payload.isLong,
    sizeDeltaUsd: payload.numbers.sizeDeltaUsd,
    initialCollateralDeltaAmount,
    contractTriggerPrice: payload.numbers.triggerPrice,
    contractAcceptablePrice: payload.numbers.acceptablePrice,
    minOutputAmount: payload.numbers.minOutputAmount,
    decreasePositionSwapType: payload.decreasePositionSwapType,
  };
}

function collectOrderEvents() {
  const pushEvent = vi.spyOn(metrics, "pushEvent").mockImplementation(() => undefined);

  return () =>
    pushEvent.mock.calls.map(([params]) => [params.event, (params.data as { requestId?: string }).requestId]);
}

describe("order metric tracking", () => {
  it("credits each order's on-chain events to its own request id PRO-4558", () => {
    const getEvents = collectOrderEvents();
    const first = buildIncreaseOrderPayload(getIncreaseParams(1_000n * 10n ** 30n)).orderPayload;
    const second = buildIncreaseOrderPayload(getIncreaseParams(1_000n * 10n ** 30n)).orderPayload;
    const twapParts = buildTwapOrdersPayloads(getIncreaseParams(900n * 10n ** 30n), {
      duration: { hours: 1, minutes: 0 },
      numberOfParts: 3,
    }).map((part) => part.orderPayload);
    const fromOtherTab = buildIncreaseOrderPayload(getIncreaseParams(2_000n * 10n ** 30n)).orderPayload;
    const takeProfit = {
      ...first,
      orderType: OrderType.LimitDecrease,
      decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
    };

    const firstMetric = initIncrease([first]);
    const secondMetric = initIncrease([second]);
    const twapMetric = initIncrease(twapParts);

    // two identical orders sent seconds apart, the first one through an external swap
    const firstCreated = getOrderCreatedEvent(first, 99_000_000n);
    const secondCreated = getOrderCreatedEvent(second);
    const twapCreated = twapParts.map((part) => getOrderCreatedEvent(part));

    for (const created of [firstCreated, secondCreated, ...twapCreated, getOrderCreatedEvent(takeProfit)]) {
      sendTrackedOrderCreatedMetric(getOrderCreationKey(created), created.key);
    }
    sendTrackedOrderCreatedMetric(getOrderCreationKey(getOrderCreatedEvent(fromOtherTab)), "0xother");
    sendTrackedOrderExecutedMetric(firstCreated.key);
    sendTrackedOrderExecutedMetric(secondCreated.key);
    sendTrackedOrderExecutedMetric("0xother");

    expect(getEvents()).toEqual([
      ["increasePosition.created", firstMetric.requestId],
      ["increasePosition.created", secondMetric.requestId],
      ["limitOrder.created", twapMetric.requestId],
      ["limitOrder.created", twapMetric.requestId],
      ["limitOrder.created", twapMetric.requestId],
      ["increasePosition.executed", firstMetric.requestId],
      ["increasePosition.executed", secondMetric.requestId],
    ]);
  });

  it("credits a retried order to the retry and a late relayed order to its failed submit PRO-4558", () => {
    const getEvents = collectOrderEvents();
    const order = buildIncreaseOrderPayload(getIncreaseParams(3_000n * 10n ** 30n)).orderPayload;
    const lateRelayed = buildIncreaseOrderPayload(getIncreaseParams(4_000n * 10n ** 30n)).orderPayload;

    const rejectedMetric = initIncrease([order]);
    sendTxnErrorMetric(
      rejectedMetric.metricId,
      { message: "User denied transaction signature", code: 4001 },
      "sending"
    );
    const retryMetric = initIncrease([order]);
    sendTxnSentMetric(retryMetric.metricId);
    sendTrackedOrderCreatedMetric(getOrderCreationKey(getOrderCreatedEvent(order)), "0xretry");

    // the relay reported no outcome in time, but the order still landed
    const lateRelayedMetric = initIncrease([lateRelayed]);
    sendTxnErrorMetric(lateRelayedMetric.metricId, new Error("The relay did not report an outcome"), "relayer");
    sendTrackedOrderCreatedMetric(getOrderCreationKey(getOrderCreatedEvent(lateRelayed)), "0xlate");

    expect(getEvents().filter(([event]) => event !== "increasePosition.sent")).toEqual([
      ["increasePosition.rejected", rejectedMetric.requestId],
      ["increasePosition.created", retryMetric.requestId],
      ["increasePosition.failed", lateRelayedMetric.requestId],
      ["increasePosition.created", lateRelayedMetric.requestId],
    ]);
  });

  it("credits GM and GLV buys, sells and keeper cancels to their own request id PRO-4558", () => {
    const getEvents = collectOrderEvents();
    const common = { receiver: ACCOUNT, callbackContract: ACCOUNT, uiFeeReceiver: ACCOUNT };
    const buyParams: RawCreateDepositParams = {
      addresses: {
        ...common,
        market: ETH_USD_MARKET,
        initialLongToken: WETH,
        initialShortToken: USDC,
        longTokenSwapPath: [],
        shortTokenSwapPath: [],
      },
      minMarketTokens: 49_000_000_000_000_000_000n,
      shouldUnwrapNativeToken: false,
      callbackGasLimit: 0n,
      dataList: [],
    };
    const sellParams: RawCreateWithdrawalParams = {
      addresses: { ...common, market: ETH_USD_MARKET, longTokenSwapPath: [], shortTokenSwapPath: [] },
      minLongTokenAmount: 10_000_000_000_000_000n,
      minShortTokenAmount: 30_000_000n,
      shouldUnwrapNativeToken: false,
      callbackGasLimit: 0n,
      dataList: [],
    };
    const glvSellParams: RawCreateGlvWithdrawalParams = {
      ...sellParams,
      addresses: { ...sellParams.addresses, glv: GLV_WETH_USDC },
    };
    const lpContext = {
      chainId: ARBITRUM,
      srcChainId: undefined,
      isExpress: false,
      isExpress1CT: false,
      isCollateralFromMultichain: false,
      longTokenAddress: WETH,
      shortTokenAddress: USDC,
      executionFeeTokenAmount: undefined,
      executionFeeTokenDecimals: 18,
      longTokenAmount: undefined,
      shortTokenAmount: undefined,
      marketTokenAmount: undefined,
      isFirstBuy: undefined,
    };
    const gmContext = { ...lpContext, marketInfo: undefined, marketToken: undefined, marketTokenUsd: undefined };

    const buyMetric = initGMSwapMetricData({ ...gmContext, isDeposit: true, rawParams: buyParams });
    const sellMetric = initGMSwapMetricData({ ...gmContext, isDeposit: false, rawParams: sellParams });
    const glvSellMetric = initGLVSwapMetricData({
      ...lpContext,
      isDeposit: false,
      rawParams: glvSellParams,
      selectedMarketForGlv: ETH_USD_MARKET,
      marketName: undefined,
      glvAddress: GLV_WETH_USDC,
      glvTokenAmount: undefined,
      glvTokenUsd: undefined,
      glvToken: undefined,
    });

    sendTrackedOrderCreatedMetric(
      getDepositCreationKey({
        marketAddress: buyParams.addresses.market,
        initialLongTokenAddress: buyParams.addresses.initialLongToken,
        initialShortTokenAddress: buyParams.addresses.initialShortToken,
        longTokenSwapPath: buyParams.addresses.longTokenSwapPath,
        shortTokenSwapPath: buyParams.addresses.shortTokenSwapPath,
        minMarketTokens: buyParams.minMarketTokens,
      }),
      "0xbuy"
    );
    sendTrackedOrderCreatedMetric(
      getWithdrawalCreationKey({
        marketAddress: ETH_USD_MARKET,
        minLongTokenAmount: sellParams.minLongTokenAmount,
        minShortTokenAmount: sellParams.minShortTokenAmount,
      }),
      "0xsell"
    );
    sendTrackedOrderCreatedMetric(
      getWithdrawalCreationKey({
        marketAddress: GLV_WETH_USDC,
        minLongTokenAmount: glvSellParams.minLongTokenAmount,
        minShortTokenAmount: glvSellParams.minShortTokenAmount,
      }),
      "0xglvsell"
    );
    sendTrackedOrderExecutedMetric("0xbuy");
    sendTrackedOrderCancelledMetric("0xsell", cancelledEvent);
    sendTrackedOrderCancelledMetric("0xglvsell", cancelledEvent);

    expect(getEvents()).toEqual([
      ["buyGM.created", buyMetric.requestId],
      ["sellGM.created", sellMetric.requestId],
      ["sellGLV.created", glvSellMetric.requestId],
      ["buyGM.executed", buyMetric.requestId],
      ["sellGM.failed", sellMetric.requestId],
      ["sellGLV.failed", glvSellMetric.requestId],
    ]);
  });
});
