import { decodeEventLog, encodeAbiParameters, encodeEventTopics, type Hex, numberToHex, pad } from "viem";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { EventLogData } from "context/SyntheticsEvents";
import {
  parseDepositCreatedEventData,
  parseGlvDepositCreatedEventData,
  parseGlvWithdrawalCreatedEventData,
  parseOrderCreatedEventData,
  parseShiftCreatedEventData,
  parseWithdrawalCreatedEventData,
} from "context/SyntheticsEvents/utils";
import { parseEventLogData } from "context/WebsocketContext/subscribeToEvents";
import type {
  RawCreateDepositParams,
  RawCreateGlvDepositParams,
  RawCreateGlvWithdrawalParams,
  RawCreateWithdrawalParams,
} from "domain/synthetics/markets";
import { abis } from "sdk/abis";
import { ARBITRUM } from "sdk/configs/chains";
import { getTokenBySymbol } from "sdk/configs/tokens";
import { DecreasePositionSwapType, OrderType } from "sdk/utils/orders/types";
import {
  buildDecreaseOrderPayload,
  buildIncreaseOrderPayload,
  buildSwapOrderPayload,
  buildTwapOrdersPayloads,
  CommonOrderParams,
  CreateOrderPayload,
  DecreasePositionOrderParams,
  IncreasePositionOrderParams,
} from "sdk/utils/orderTransactions";
import type { ERC20Address, TokenData } from "sdk/utils/tokens/types";

import { metrics } from "./Metrics";
import { OrderCreationTracker } from "./orderCreationTracking";
import type { OrderMetricId } from "./types";
import {
  getDepositCreationKey,
  getGlvDepositCreationKey,
  getOrderCreationKey,
  getOrderPayloadsCreationKeys,
  getShiftCreationKey,
  getWithdrawalCreationKey,
  initGLVSwapMetricData,
  initGMSwapMetricData,
  initIncreaseOrderMetricData,
  initShiftGmMetricData,
  sendOrderSubmittedMetric,
  sendOrderTxnSubmittedMetric,
  sendTrackedOrderCancelledMetric,
  sendTrackedOrderCreatedMetric,
  sendTrackedOrderExecutedMetric,
  sendTxnErrorMetric,
  sendTxnSentMetric,
  sendTxnValidationErrorMetric,
} from "./utils";

const ACCOUNT = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const ETH_USD_MARKET = "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336";
const DOGE_USD_MARKET = "0x6853EA96FF216fAb11D2d930CE3C508556A4bdc4";
const GLV_WETH_USDC = "0x528A5bac7E746C9A509A1f4F6dF58A03d44279F9";
const WETH = getTokenBySymbol(ARBITRUM, "WETH").address as ERC20Address;
const USDC = getTokenBySymbol(ARBITRUM, "USDC").address as ERC20Address;
const USD = 10n ** 30n;

const USER_REJECTION = { message: "User denied transaction signature", code: 4001 };
const NO_RELAY_OUTCOME = new Error("The relay did not report an outcome for this operation");
const SIGNING_ERROR = new Error("The wallet could not sign the request");
const CONTRACT_ERROR = new Error("execution reverted");

const EVENT_LOG2 = abis.EventEmitter.find((item) => item.type === "event" && item.name === "EventLog2")!;

const COMMON_ORDER_PARAMS: CommonOrderParams = {
  chainId: ARBITRUM,
  receiver: ACCOUNT,
  executionFeeAmount: 200_000_000_000_000n,
  executionGasLimit: 5_000_000n,
  referralCode: undefined,
  uiFeeReceiver: undefined,
  allowedSlippage: 30,
  autoCancel: false,
  validFromTime: 0n,
};

const cancelledEvent = {
  stringItems: { items: { reason: "MinMarketTokens" }, arrayItems: {} },
} as unknown as EventLogData;

beforeEach(() => {
  metrics.orderCreationTracker = new OrderCreationTracker();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function getKey(index: number) {
  return pad(numberToHex(index));
}

type EventItems = { items?: Record<string, unknown>; arrayItems?: Record<string, unknown[]> };

function toRawItems({ items = {}, arrayItems = {} }: EventItems = {}) {
  return {
    items: Object.entries(items).map(([key, value]) => ({ key, value })),
    arrayItems: Object.entries(arrayItems).map(([key, value]) => ({ key, value })),
  };
}

// items are named as the contracts' *EventUtils.createEventData emit them; the log goes through the same
// ABI decoding and parseEventLogData as the websocket subscription
function getCreatedEventLogData(
  eventName: string,
  key: Hex,
  { addressItems, uintItems, boolItems, bytes32Items }: Partial<Record<keyof EventLogData, EventItems>>
): EventLogData {
  const eventData = {
    addressItems: toRawItems({ ...addressItems, items: { account: ACCOUNT, ...addressItems?.items } }),
    uintItems: toRawItems(uintItems),
    intItems: toRawItems(),
    boolItems: toRawItems(boolItems),
    bytes32Items: toRawItems({ ...bytes32Items, items: { key } }),
    bytesItems: toRawItems(),
    stringItems: toRawItems(),
  };

  const log = decodeEventLog({
    abi: abis.EventEmitter,
    eventName: "EventLog2",
    topics: encodeEventTopics({
      abi: abis.EventEmitter,
      eventName: "EventLog2",
      args: { eventNameHash: eventName, topic1: key, topic2: pad(ACCOUNT) },
    }) as [Hex, ...Hex[]],
    data: encodeAbiParameters(
      EVENT_LOG2.inputs.filter((input) => !("indexed" in input && input.indexed)),
      [ACCOUNT, eventName, eventData]
    ),
  });

  return parseEventLogData(log.args.eventData);
}

// OrderCreated carries the order params as sent, except initialCollateralDeltaAmount of increase and swap orders:
// the contract records what reached the order vault, which an external swap changes
function getOrderCreatedEventData(
  payload: CreateOrderPayload,
  key: Hex,
  initialCollateralDeltaAmount = payload.numbers.initialCollateralDeltaAmount
) {
  return parseOrderCreatedEventData(
    getCreatedEventLogData("OrderCreated", key, {
      addressItems: {
        items: {
          uiFeeReceiver: payload.addresses.uiFeeReceiver,
          market: payload.addresses.market,
          initialCollateralToken: payload.addresses.initialCollateralToken,
        },
        arrayItems: { swapPath: payload.addresses.swapPath },
      },
      uintItems: {
        items: {
          orderType: BigInt(payload.orderType),
          decreasePositionSwapType: BigInt(payload.decreasePositionSwapType),
          sizeDeltaUsd: payload.numbers.sizeDeltaUsd,
          initialCollateralDeltaAmount,
          triggerPrice: payload.numbers.triggerPrice,
          acceptablePrice: payload.numbers.acceptablePrice,
          minOutputAmount: payload.numbers.minOutputAmount,
        },
      },
      boolItems: { items: { isLong: payload.isLong } },
      bytes32Items: { arrayItems: { dataList: payload.dataList } },
    })
  );
}

function createOrder(payload: CreateOrderPayload, key: Hex, initialCollateralDeltaAmount?: bigint) {
  const data = getOrderCreatedEventData(payload, key, initialCollateralDeltaAmount);

  sendTrackedOrderCreatedMetric(getOrderCreationKey(data), data.key);
}

function createDeposit(params: RawCreateDepositParams | RawCreateGlvDepositParams, key: Hex) {
  const { addresses } = params;
  const glv = "glv" in addresses ? addresses.glv : undefined;
  const eventData = getCreatedEventLogData(glv ? "GlvDepositCreated" : "DepositCreated", key, {
    addressItems: {
      items: {
        market: addresses.market,
        initialLongToken: addresses.initialLongToken,
        initialShortToken: addresses.initialShortToken,
        ...(glv ? { glv } : {}),
      },
      arrayItems: { longTokenSwapPath: addresses.longTokenSwapPath, shortTokenSwapPath: addresses.shortTokenSwapPath },
    },
    uintItems: {
      items: "minGlvTokens" in params ? { minGlvTokens: params.minGlvTokens } : { minMarketTokens: params.minMarketTokens },
    },
  });

  if (glv) {
    const data = parseGlvDepositCreatedEventData(eventData);
    sendTrackedOrderCreatedMetric(getGlvDepositCreationKey(data), data.key);
  } else {
    const data = parseDepositCreatedEventData(eventData);
    sendTrackedOrderCreatedMetric(getDepositCreationKey(data), data.key);
  }
}

function createWithdrawal(params: RawCreateWithdrawalParams | RawCreateGlvWithdrawalParams, key: Hex) {
  const { addresses } = params;
  const glv = "glv" in addresses ? addresses.glv : undefined;
  const eventData = getCreatedEventLogData(glv ? "GlvWithdrawalCreated" : "WithdrawalCreated", key, {
    addressItems: { items: { market: addresses.market, ...(glv ? { glv } : {}) } },
    uintItems: {
      items: { minLongTokenAmount: params.minLongTokenAmount, minShortTokenAmount: params.minShortTokenAmount },
    },
  });

  const data = glv ? parseGlvWithdrawalCreatedEventData(eventData) : parseWithdrawalCreatedEventData(eventData);

  sendTrackedOrderCreatedMetric(getWithdrawalCreationKey(data), data.key);
}

function createShift(fromMarket: string, toMarket: string, marketTokenAmount: bigint, key: Hex) {
  const data = parseShiftCreatedEventData(
    getCreatedEventLogData("ShiftCreated", key, {
      addressItems: { items: { fromMarket, toMarket } },
      uintItems: { items: { marketTokenAmount } },
    })
  );

  sendTrackedOrderCreatedMetric(getShiftCreationKey(data), data.key);
}

function getIncreaseParams(sizeDeltaUsd: bigint): IncreasePositionOrderParams {
  return {
    ...COMMON_ORDER_PARAMS,
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
    acceptablePrice: 3_000n * USD,
    triggerPrice: undefined,
  };
}

function getDecreaseParams(
  orderType: DecreasePositionOrderParams["orderType"],
  triggerPrice?: bigint
): DecreasePositionOrderParams {
  return {
    ...COMMON_ORDER_PARAMS,
    marketAddress: ETH_USD_MARKET,
    indexTokenAddress: WETH,
    isLong: true,
    sizeDeltaUsd: 1_000n * USD,
    sizeDeltaInTokens: 1n,
    acceptablePrice: 2_900n * USD,
    triggerPrice,
    collateralTokenAddress: WETH,
    collateralDeltaAmount: 10n ** 17n,
    swapPath: [ETH_USD_MARKET],
    externalSwapQuote: undefined,
    receiveTokenAddress: USDC,
    minOutputUsd: 290n * USD,
    decreasePositionSwapType: DecreasePositionSwapType.SwapPnlTokenToCollateralToken,
    orderType,
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

function getMarketToken(address: string): TokenData {
  return { address, name: "GM", symbol: "GM", decimals: 18, prices: { minPrice: USD, maxPrice: USD } };
}

function collectOrderEvents() {
  const pushEvent = vi.spyOn(metrics, "pushEvent").mockImplementation(() => undefined);

  return () =>
    pushEvent.mock.calls.map(([params]): [string, string | undefined] => [
      params.event,
      (params.data as { requestId?: string }).requestId,
    ]);
}

function isOrderResultEvent([event]: [string, string | undefined]) {
  return event.endsWith(".created") || event.endsWith(".executed");
}

describe("order metric tracking", () => {
  it("credits each order's on-chain events to its own request id PRO-4558", () => {
    vi.useFakeTimers();
    const getEvents = collectOrderEvents();
    const order = buildIncreaseOrderPayload(getIncreaseParams(1_000n * USD)).orderPayload;
    const twapParts = buildTwapOrdersPayloads(
      { ...getIncreaseParams(900n * USD), swapPath: [ETH_USD_MARKET], collateralTokenAddress: WETH },
      { duration: { hours: 1, minutes: 0 }, numberOfParts: 3 }
    ).map((part) => part.orderPayload);
    const fromOtherTab = buildIncreaseOrderPayload(getIncreaseParams(2_000n * USD)).orderPayload;
    const takeProfit = {
      ...order,
      orderType: OrderType.LimitDecrease,
      decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
    };

    const staleMetric = initIncrease([order]);
    sendTxnSentMetric(staleMetric.metricId);
    vi.advanceTimersByTime(60_000);

    const noOutcomeMetric = initIncrease([order]);
    sendTxnSentMetric(noOutcomeMetric.metricId);
    sendTxnErrorMetric(noOutcomeMetric.metricId, NO_RELAY_OUTCOME, "relayer");
    const firstMetric = initIncrease([order]);
    sendTxnSentMetric(firstMetric.metricId);
    const secondMetric = initIncrease([order]);
    sendTxnSentMetric(secondMetric.metricId);
    initIncrease([order]);
    const twapMetric = initIncrease(twapParts);
    sendOrderSubmittedMetric(twapMetric.metricId);

    // two identical orders sent seconds apart, the first one through an external swap, then the order the relay
    // reported no outcome for: sent submissions without a failure go first, then the earliest one. The submission
    // sent a minute earlier is not tracked anymore; the last identical submission still waits for the wallet and,
    // created after the others, gets nothing
    createOrder(order, getKey(1), 99_000_000n);
    createOrder(order, getKey(2));
    createOrder(order, getKey(3));
    twapParts.forEach((part, index) => {
      vi.advanceTimersByTime(1_000);
      createOrder(part, getKey(4 + index));
    });
    createOrder(takeProfit, getKey(7));
    createOrder(fromOtherTab, getKey(8));
    [1, 1, 2, 8].forEach((index) => sendTrackedOrderExecutedMetric(getKey(index)));

    expect(getEvents().filter(isOrderResultEvent)).toEqual([
      ["increasePosition.created", firstMetric.requestId],
      ["increasePosition.created", secondMetric.requestId],
      ["increasePosition.created", noOutcomeMetric.requestId],
      ["limitOrder.created", twapMetric.requestId],
      ["limitOrder.created", twapMetric.requestId],
      ["limitOrder.created", twapMetric.requestId],
      ["increasePosition.executed", firstMetric.requestId],
      ["increasePosition.executed", secondMetric.requestId],
    ]);
    expect(
      vi
        .mocked(metrics.pushEvent)
        .mock.calls.filter(([params]) => params.event === "limitOrder.created")
        .map(([params]) => params.time)
    ).toEqual([1_000, 2_000, 3_000]);
  });

  it.each([
    {
      order: "market decrease that swaps the PnL",
      payload: buildDecreaseOrderPayload(getDecreaseParams(OrderType.MarketDecrease)).orderPayload,
    },
    {
      order: "stop-loss",
      payload: buildDecreaseOrderPayload(getDecreaseParams(OrderType.StopLossDecrease, 2_500n * USD)).orderPayload,
    },
    {
      order: "market swap",
      payload: buildSwapOrderPayload({
        ...COMMON_ORDER_PARAMS,
        payTokenAddress: USDC,
        payTokenAmount: 100_000_000n,
        receiveTokenAddress: WETH,
        swapPath: [ETH_USD_MARKET],
        externalSwapQuote: undefined,
        minOutputAmount: 3n * 10n ** 16n,
        orderType: OrderType.MarketSwap,
        triggerRatio: undefined,
      }).orderPayload,
    },
  ])("gives a $order the creation key of its parsed OrderCreated log PRO-4558", ({ payload }) => {
    expect(getOrderCreationKey(getOrderCreatedEventData(payload, getKey(1)))).toBe(
      getOrderPayloadsCreationKeys([payload])[0]
    );
  });

  it.each([
    {
      submission: "rejected in the wallet",
      fail: (metricId: OrderMetricId) => {
        sendOrderTxnSubmittedMetric(metricId);
        sendTxnErrorMetric(metricId, USER_REJECTION, "sending");
      },
      isCredited: false,
    },
    {
      submission: "stopped by validation",
      fail: (metricId: OrderMetricId) => sendTxnValidationErrorMetric(metricId),
      isCredited: false,
    },
    {
      submission: "whose simulation failed",
      fail: (metricId: OrderMetricId) => sendTxnErrorMetric(metricId, CONTRACT_ERROR, "simulation"),
      isCredited: false,
    },
    {
      submission: "reverted on-chain",
      fail: (metricId: OrderMetricId) => {
        sendTxnSentMetric(metricId);
        sendTxnErrorMetric(metricId, CONTRACT_ERROR, "minting");
      },
      isCredited: false,
    },
    {
      submission: "with no relay outcome 59 seconds ago",
      fail: (metricId: OrderMetricId) => {
        sendTxnSentMetric(metricId);
        sendTxnErrorMetric(metricId, NO_RELAY_OUTCOME, "relayer");
        vi.advanceTimersByTime(59_000);
      },
      isCredited: true,
    },
    {
      submission: "with no relay outcome a minute ago",
      fail: (metricId: OrderMetricId) => {
        sendTxnSentMetric(metricId);
        sendTxnErrorMetric(metricId, NO_RELAY_OUTCOME, "relayer");
        vi.advanceTimersByTime(60_000);
      },
      isCredited: false,
    },
    {
      submission: "whose signing failed a minute ago",
      fail: (metricId: OrderMetricId) => {
        sendTxnErrorMetric(metricId, SIGNING_ERROR, "unknown");
        vi.advanceTimersByTime(60_000);
      },
      isCredited: false,
    },
  ])(
    "credits the same order created later to a submission $submission: $isCredited PRO-4558",
    ({ fail, isCredited }) => {
      vi.useFakeTimers();
      const getEvents = collectOrderEvents();
      const limitOrder = buildIncreaseOrderPayload({
        ...getIncreaseParams(5_000n * USD),
        orderType: OrderType.LimitIncrease,
        triggerPrice: 2_900n * USD,
      }).orderPayload;
      const submission = initIncrease([limitOrder]);

      fail(submission.metricId);
      createOrder(limitOrder, getKey(1));
      sendTrackedOrderExecutedMetric(getKey(1));

      expect(getEvents().filter(isOrderResultEvent)).toEqual(
        isCredited
          ? [
              ["limitOrder.created", submission.requestId],
              ["limitOrder.executed", submission.requestId],
            ]
          : []
      );
    }
  );

  it("credits GM and GLV buys, sells, shifts and keeper cancels to their own request id PRO-4558", () => {
    const getEvents = collectOrderEvents();
    const common = { receiver: ACCOUNT, callbackContract: ACCOUNT, uiFeeReceiver: ACCOUNT };
    const buyParams: RawCreateDepositParams = {
      addresses: {
        ...common,
        market: ETH_USD_MARKET,
        initialLongToken: USDC,
        initialShortToken: USDC,
        longTokenSwapPath: [ETH_USD_MARKET],
        shortTokenSwapPath: [],
      },
      minMarketTokens: 49n * 10n ** 18n,
      shouldUnwrapNativeToken: false,
      callbackGasLimit: 0n,
      dataList: [],
    };
    const glvBuyParams: RawCreateGlvDepositParams = {
      addresses: { ...buyParams.addresses, glv: GLV_WETH_USDC },
      minGlvTokens: 31n * 10n ** 18n,
      shouldUnwrapNativeToken: false,
      callbackGasLimit: 0n,
      isMarketTokenDeposit: false,
      dataList: [],
    };
    const sellParams: RawCreateWithdrawalParams = {
      addresses: { ...common, market: ETH_USD_MARKET, longTokenSwapPath: [], shortTokenSwapPath: [] },
      minLongTokenAmount: 10n ** 16n,
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
    const glvContext = {
      ...lpContext,
      selectedMarketForGlv: ETH_USD_MARKET,
      marketName: undefined,
      glvAddress: GLV_WETH_USDC,
      glvTokenAmount: undefined,
      glvTokenUsd: undefined,
      glvToken: undefined,
    };
    const shiftAmount = 20n * 10n ** 18n;

    const buyMetric = initGMSwapMetricData({ ...gmContext, isDeposit: true, rawParams: buyParams });
    const glvBuyMetric = initGLVSwapMetricData({ ...glvContext, isDeposit: true, rawParams: glvBuyParams });
    const sellMetric = initGMSwapMetricData({ ...gmContext, isDeposit: false, rawParams: sellParams });
    const glvSellMetric = initGLVSwapMetricData({ ...glvContext, isDeposit: false, rawParams: glvSellParams });
    const shiftMetric = initShiftGmMetricData({
      chainId: ARBITRUM,
      isExpress: false,
      isExpress1CT: false,
      isCollateralFromMultichain: false,
      executionFee: undefined,
      fromMarketToken: getMarketToken(ETH_USD_MARKET),
      fromMarketTokenAmount: shiftAmount,
      toMarketToken: getMarketToken(DOGE_USD_MARKET),
      minMarketTokenAmount: undefined,
    });

    // GMX Account requests are marked as sent only after the relay responds, so a relay timeout can come first
    sendTxnErrorMetric(glvBuyMetric.metricId, NO_RELAY_OUTCOME, "sending");
    createDeposit(buyParams, getKey(1));
    createDeposit(glvBuyParams, getKey(2));
    createWithdrawal(sellParams, getKey(3));
    createWithdrawal(glvSellParams, getKey(4));
    createShift(ETH_USD_MARKET, DOGE_USD_MARKET, shiftAmount, getKey(5));
    sendTrackedOrderExecutedMetric(getKey(1));
    sendTrackedOrderExecutedMetric(getKey(2));
    sendTrackedOrderCancelledMetric(getKey(3), cancelledEvent);
    sendTrackedOrderCancelledMetric(getKey(4), cancelledEvent);
    sendTrackedOrderExecutedMetric(getKey(5));

    expect(getEvents()).toEqual([
      ["buyGLV.failed", glvBuyMetric.requestId],
      ["buyGM.created", buyMetric.requestId],
      ["buyGLV.created", glvBuyMetric.requestId],
      ["sellGM.created", sellMetric.requestId],
      ["sellGLV.created", glvSellMetric.requestId],
      ["shiftGM.created", shiftMetric.requestId],
      ["buyGM.executed", buyMetric.requestId],
      ["buyGLV.executed", glvBuyMetric.requestId],
      ["sellGM.failed", sellMetric.requestId],
      ["sellGLV.failed", glvSellMetric.requestId],
      ["shiftGM.executed", shiftMetric.requestId],
    ]);
  });
});
