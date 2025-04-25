import debounce from "lodash/debounce";

import { getChainName } from "config/chains";
import { USD_DECIMALS } from "config/factors";
import { MarketInfo } from "domain/synthetics/markets";
import {
  EditingOrderSource,
  OrderInfo,
  isLimitOrderType,
  isMarketOrderType,
  isStopIncreaseOrderType,
  isSwapOrderType,
  isTriggerDecreaseOrderType,
  isTwapOrder,
} from "domain/synthetics/orders";
import { TradeMode, TradeType } from "domain/synthetics/trade";
import { getTwapDurationInSeconds } from "domain/synthetics/trade/twap/utils";
import {
  PositionOrderMetricParams,
  SwapMetricData,
  formatAmountForMetrics,
  formatPercentageForMetrics,
  metrics,
} from "lib/metrics";
import { OrderMetricData, OrderMetricId } from "lib/metrics/types";
import { bigintToNumber, formatRatePercentage, roundToOrder } from "lib/numbers";
import { parseError } from "lib/parseError";
import { userAnalytics } from "lib/userAnalytics";
import {
  AnalyticsOrderType,
  ConnectWalletClickEvent,
  DepthChartInteractionEvent,
  PoolsPageBuyConfirmEvent,
  PoolsPageBuyResultEvent,
  TradeBoxConfirmClickEvent,
  TradeBoxInteractionStartedEvent,
  TradeBoxResultEvent,
  TradePageEditOrderEvent,
} from "lib/userAnalytics/types";

export function getTradeInteractionKey(pair: string) {
  return `trade-${pair}`;
}

export function sendUserAnalyticsConnectWalletClickEvent(position: ConnectWalletClickEvent["data"]["position"]) {
  userAnalytics.pushEvent<ConnectWalletClickEvent>({
    event: "ConnectWalletAction",
    data: {
      action: "ConnectWalletClick",
      position,
    },
  });
}

export const sendTradeBoxInteractionStartedEvent = debounce(
  (p: {
    pair: string;
    sizeDeltaUsd?: bigint;
    priceImpactDeltaUsd?: bigint;
    priceImpactPercentage?: bigint;
    fundingRate1h?: bigint;
    openInterestPercent?: number;
    tradeType: TradeType;
    tradeMode: TradeMode;
    amountUsd?: bigint;
  }) => {
    const {
      pair,
      fundingRate1h,
      sizeDeltaUsd,
      priceImpactDeltaUsd,
      priceImpactPercentage,
      openInterestPercent,
      tradeType,
      tradeMode,
      amountUsd,
    } = p;

    const interactionId = userAnalytics.createInteractionId(getTradeInteractionKey(pair));

    userAnalytics.pushEvent<TradeBoxInteractionStartedEvent>(
      {
        event: "TradeBoxAction",
        data: {
          action: "InteractionStarted",
          pair,
          sizeDeltaUsd: formatAmountForMetrics(sizeDeltaUsd),
          amountUsd: formatAmountForMetrics(amountUsd),
          priceImpactDeltaUsd:
            priceImpactDeltaUsd !== undefined ? bigintToNumber(roundToOrder(priceImpactDeltaUsd, 2), USD_DECIMALS) : 0,
          priceImpactPercentage: formatPercentageForMetrics(priceImpactPercentage) ?? 0,
          netRate1h: parseFloat(formatRatePercentage(fundingRate1h)),
          openInterestPercent: openInterestPercent !== undefined ? Number(openInterestPercent) : 0,
          tradeType,
          tradeMode,
          interactionId,
        },
      },
      { dedupKey: pair }
    );
  },
  500
);

export function sendUserAnalyticsOrderConfirmClickEvent(chainId: number, metricId: OrderMetricId) {
  let metricData = metrics.getCachedMetricData<OrderMetricData>(metricId);

  if (!metricData) {
    metrics.pushError("Order metric data not found", "sendUserAnalyticsTradeBoxConfirmClickEvent");
    return;
  }

  switch (metricData.metricType) {
    case "increasePosition":
      userAnalytics.pushEvent<TradeBoxConfirmClickEvent>({
        event: "TradeBoxAction",
        data: {
          action: "IncreasePositionConfirmClick",
          pair: metricData.marketName || "",
          pool: metricData.marketPoolName || "",
          type: metricData.isLong ? "Long" : "Short",
          orderType: getAnalyticsOrderTypeByTradeMode(metricData.tradeMode),
          tradeType: metricData.hasExistingPosition ? "IncreaseSize" : "InitialTrade",
          sizeDeltaUsd: metricData.sizeDeltaUsd,
          leverage: metricData.leverage || "",
          is1CT: metricData.is1ct,
          slCount: metricData.slCount,
          tpCount: metricData.tpCount,
          isTPSLCreated: metricData.isTPSLCreated ?? false,
          chain: getChainName(chainId),
          isFirstOrder: metricData.isFirstOrder ?? false,
          interactionId: metricData.interactionId,
          priceImpactDeltaUsd: metricData.priceImpactDeltaUsd,
          priceImpactPercentage: metricData.priceImpactPercentage,
          netRate1h: metricData.netRate1h,
          duration: metricData.tradeMode === TradeMode.Twap ? getTwapDurationInSeconds(metricData.duration) : undefined,
          partsCount: metricData.tradeMode === TradeMode.Twap ? metricData.partsCount : undefined,
        },
      });
      break;
    case "decreasePosition":
    case "stopLossOrder":
    case "takeProfitOrder":
      userAnalytics.pushEvent<TradeBoxConfirmClickEvent>({
        event: "TradeBoxAction",
        data: {
          action: "DecreasePositionConfirmClick",
          pair: metricData.marketName || "",
          pool: metricData.marketPoolName || "",
          type: metricData.isLong ? "Long" : "Short",
          orderType: getAnalyticsOrderTypeByTradeMode(metricData.tradeMode),
          tradeType: metricData.isFullClose ? "ClosePosition" : "DecreaseSize",
          sizeDeltaUsd: metricData.sizeDeltaUsd,
          leverage: "",
          is1CT: metricData.is1ct,
          chain: getChainName(chainId),
          isFirstOrder: false,
          interactionId: metricData.interactionId,
          priceImpactDeltaUsd: metricData.priceImpactDeltaUsd,
          priceImpactPercentage: metricData.priceImpactPercentage,
          netRate1h: metricData.netRate1h,
          duration: metricData.tradeMode === TradeMode.Twap ? getTwapDurationInSeconds(metricData.duration) : undefined,
          partsCount: metricData.tradeMode === TradeMode.Twap ? metricData.partsCount : undefined,
        },
      });
      break;
    case "swap":
      userAnalytics.pushEvent<TradeBoxConfirmClickEvent>({
        event: "TradeBoxAction",
        data: {
          action: "SwapConfirmClick",
          pair: `${metricData.initialCollateralSymbol}/${metricData.toTokenSymbol}`,
          pool: "",
          type: "Swap",
          orderType: getAnalyticsOrderTypeByTradeMode(metricData.tradeMode),
          tradeType: "InitialTrade",
          amountUsd: metricData.amountUsd,
          leverage: "",
          is1CT: metricData.is1ct,
          chain: getChainName(chainId),
          isFirstOrder: metricData.isFirstOrder ?? false,
          interactionId: undefined,
          priceImpactDeltaUsd: undefined,
          priceImpactPercentage: undefined,
          netRate1h: undefined,
          duration: metricData.tradeMode === TradeMode.Twap ? getTwapDurationInSeconds(metricData.duration) : undefined,
          partsCount: metricData.tradeMode === TradeMode.Twap ? metricData.partsCount : undefined,
        },
      });
      break;
    case "buyGM":
      userAnalytics.pushEvent<PoolsPageBuyConfirmEvent>({
        event: "PoolsPageAction",
        data: {
          action: "BuyConfirm",
          type: "GM",
          poolName: metricData.marketName || "",
          glvAddress: "",
          amountUsd: metricData.marketTokenUsd || 0,
          isFirstBuy: metricData.isFirstBuy ?? false,
        },
      });
      break;
    case "buyGLV":
      userAnalytics.pushEvent<PoolsPageBuyConfirmEvent>({
        event: "PoolsPageAction",
        data: {
          action: "BuyConfirm",
          type: "GLV",
          poolName: metricData.marketName || "",
          glvAddress: metricData.glvAddress || "",
          amountUsd: metricData.glvTokenUsd || 0,
          isFirstBuy: metricData.isFirstBuy ?? false,
        },
      });
      break;
    default:
      break;
  }
}

export function sendUserAnalyticsOrderResultEvent(
  chainId: number,
  metricId: OrderMetricId,
  isSuccess: boolean,
  error?: Error
) {
  let metricData = metrics.getCachedMetricData<OrderMetricData>(metricId);

  if (!metricData) {
    metrics.pushError("Order metric data not found", "sendUserAnalyticsTradeBoxPositionResultEvent");
    return;
  }

  const isUserError = Boolean(parseError(error)?.isUserError);

  switch (metricData.metricType) {
    case "increasePosition":
      userAnalytics.pushEvent<TradeBoxResultEvent>({
        event: "TradeBoxAction",
        data: {
          action: isSuccess ? "IncreasePositionSuccess" : "IncreasePositionFail",
          pair: metricData.marketName || "",
          pool: metricData.marketPoolName || "",
          type: metricData.isLong ? "Long" : "Short",
          orderType: getAnalyticsOrderTypeByTradeMode(metricData.tradeMode),
          tradeType: metricData.hasExistingPosition ? "IncreaseSize" : "InitialTrade",
          sizeDeltaUsd: metricData.sizeDeltaUsd || 0,
          leverage: metricData.leverage || "",
          is1CT: metricData.is1ct,
          isTPSLCreated: metricData.isTPSLCreated ?? false,
          slCount: metricData.slCount,
          tpCount: metricData.tpCount,
          chain: getChainName(chainId),
          isFirstOrder: metricData.isFirstOrder ?? false,
          isLeverageEnabled: Boolean(metricData.isLeverageEnabled),
          isUserError,
          interactionId: metricData.interactionId,
          priceImpactDeltaUsd: metricData.priceImpactDeltaUsd,
          priceImpactPercentage: metricData.priceImpactPercentage,
          netRate1h: metricData.netRate1h,
          ...getAnalyticsTwapProps(metricData),
        },
      });
      break;
    case "decreasePosition":
    case "stopLossOrder":
    case "takeProfitOrder":
      userAnalytics.pushEvent<TradeBoxResultEvent>({
        event: "TradeBoxAction",
        data: {
          action: isSuccess ? "DecreasePositionSuccess" : "DecreasePositionFail",
          pair: metricData.marketName || "",
          pool: metricData.marketPoolName || "",
          type: metricData.isLong ? "Long" : "Short",
          orderType: getAnalyticsOrderTypeByTradeMode(metricData.tradeMode),
          tradeType: metricData.isFullClose ? "ClosePosition" : "DecreaseSize",
          sizeDeltaUsd: metricData.sizeDeltaUsd || 0,
          leverage: "",
          is1CT: metricData.is1ct,
          chain: getChainName(chainId),
          isFirstOrder: false,
          isUserError,
          interactionId: metricData.interactionId,
          priceImpactDeltaUsd: metricData.priceImpactDeltaUsd,
          priceImpactPercentage: metricData.priceImpactPercentage,
          netRate1h: metricData.netRate1h,
          ...getAnalyticsTwapProps(metricData),
        },
      });
      break;
    case "swap":
      userAnalytics.pushEvent<TradeBoxResultEvent>({
        event: "TradeBoxAction",
        data: {
          action: isSuccess ? "SwapSuccess" : "SwapFail",
          pair: `${metricData.initialCollateralSymbol}/${metricData.toTokenSymbol}`,
          pool: "",
          type: "Swap",
          orderType: getAnalyticsOrderTypeByTradeMode(metricData.tradeMode),
          tradeType: "InitialTrade",
          amountUsd: metricData.amountUsd,
          leverage: "",
          is1CT: metricData.is1ct,
          chain: getChainName(chainId),
          isFirstOrder: metricData.isFirstOrder ?? false,
          isUserError,
          interactionId: undefined,
          priceImpactDeltaUsd: undefined,
          priceImpactPercentage: undefined,
          netRate1h: undefined,
          ...getAnalyticsTwapProps(metricData),
        },
      });
      break;
    case "buyGM":
    case "sellGM":
      userAnalytics.pushEvent<PoolsPageBuyResultEvent>({
        event: "PoolsPageAction",
        data: {
          action: isSuccess ? "BuySuccess" : "BuyFail",
          type: "GM",
          poolName: metricData.marketName || "",
          glvAddress: "",
          amountUsd: metricData.marketTokenUsd || 0,
          isFirstBuy: metricData.isFirstBuy ?? false,
          isUserError,
        },
      });
      break;
    case "buyGLV":
    case "sellGLV":
      userAnalytics.pushEvent<PoolsPageBuyResultEvent>({
        event: "PoolsPageAction",
        data: {
          action: isSuccess ? "BuySuccess" : "BuyFail",
          type: "GLV",
          poolName: metricData.marketName || "",
          glvAddress: metricData.glvAddress || "",
          amountUsd: metricData.glvTokenUsd || 0,
          isFirstBuy: metricData.isFirstBuy ?? false,
          isUserError,
        },
      });
      break;

    default:
      break;
  }
}

export function makeUserAnalyticsOrderFailResultHandler(chainId: number, metricId: OrderMetricId) {
  return (error: Error) => {
    sendUserAnalyticsOrderResultEvent(chainId, metricId, false, error);
    throw error;
  };
}

export const sendDepthChartInteractionEvent = (pair: string) => {
  userAnalytics.pushEvent<DepthChartInteractionEvent>(
    {
      event: "TradePageAction",
      data: {
        action: "DepthChartInteraction",
        pair,
      },
    },
    { dedupKey: pair }
  );
};

const getAnalyticsTwapProps = (metricData: PositionOrderMetricParams | SwapMetricData) => {
  return {
    duration: metricData.tradeMode === TradeMode.Twap ? getTwapDurationInSeconds(metricData.duration) : undefined,
    partsCount: metricData.tradeMode === TradeMode.Twap ? metricData.partsCount : undefined,
  };
};

export const getAnalyticsOrderTypeByTradeMode = (tradeMode: TradeMode | undefined): AnalyticsOrderType | undefined => {
  if (!tradeMode) return undefined;

  const analyticsOrderTypeByTradeMode: Record<TradeMode, AnalyticsOrderType> = {
    [TradeMode.Market]: "Market",
    [TradeMode.Limit]: "Limit",
    [TradeMode.Trigger]: "TPSL",
    [TradeMode.Twap]: "TWAP",
    [TradeMode.StopMarket]: "StopMarket",
  };

  return analyticsOrderTypeByTradeMode[tradeMode];
};

const getAnalyticsOrderTypeByOrder = (order: OrderInfo): AnalyticsOrderType | undefined => {
  if (isTwapOrder(order)) return "TWAP";
  if (isMarketOrderType(order.orderType)) return "Market";
  if (isLimitOrderType(order.orderType)) return "Limit";
  if (isTriggerDecreaseOrderType(order.orderType)) return "TPSL";
  if (isStopIncreaseOrderType(order.orderType)) return "StopMarket";

  return undefined;
};

export const sendEditOrderEvent = ({
  order,
  source,
  marketInfo,
}: {
  order: OrderInfo;
  source: EditingOrderSource;
  marketInfo: MarketInfo;
}) => {
  const orderType = getAnalyticsOrderTypeByOrder(order);

  if (!orderType) {
    return;
  }

  const pair = isSwapOrderType(order.orderType)
    ? `${order.initialCollateralToken.symbol}/${order.targetCollateralToken.symbol}`
    : marketInfo.name;

  userAnalytics.pushEvent<TradePageEditOrderEvent>({
    event: "TradePageAction",
    data: {
      action: "EditOrder",
      orderType,
      pair,
      source,
    },
  });
};
