import { getChainName } from "config/chains";
import { OrderType } from "domain/synthetics/orders";
import { TradeMode, TradeType } from "domain/synthetics/trade";
import { formatAmountForMetrics, metrics } from "lib/metrics";
import { prepareErrorMetricData } from "lib/metrics/errorReporting";
import { OrderMetricData, OrderMetricId } from "lib/metrics/types";
import { formatRatePercentage } from "lib/numbers";
import { userAnalytics } from "lib/userAnalytics";
import {
  ConnectWalletClickEvent,
  PoolsPageBuyConfirmEvent,
  PoolsPageBuyResultEvent,
  TradeBoxConfirmClickEvent,
  TradeBoxInteractionStartedEvent,
  TradeBoxResultEvent,
} from "lib/userAnalytics/types";
import debounce from "lodash/debounce";

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
    priceImpactBps?: bigint;
    fundingRate1h?: bigint;
    openInterestPercent?: number;
    tradeType: TradeType;
    tradeMode: TradeMode;
  }) => {
    const {
      pair,
      fundingRate1h,
      sizeDeltaUsd,
      priceImpactDeltaUsd,
      priceImpactBps,
      openInterestPercent,
      tradeType,
      tradeMode,
    } = p;

    userAnalytics.pushEvent<TradeBoxInteractionStartedEvent>(
      {
        event: "TradeBoxAction",
        data: {
          action: "InteractionStarted",
          pair,
          sizeDeltaUsd: formatAmountForMetrics(sizeDeltaUsd) ?? 0,
          priceImpactDeltaUsd: formatAmountForMetrics(priceImpactDeltaUsd) ?? 0,
          priceImpactBps: priceImpactBps !== undefined ? Number(priceImpactBps) : 0,
          netRate1h: parseFloat(formatRatePercentage(fundingRate1h)),
          openInterestPercent: openInterestPercent !== undefined ? Number(openInterestPercent) : 0,
          tradeType,
          tradeMode,
        },
      },
      { dedupKey: pair }
    );
  },
  400
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
          pair: metricData.marketIndexName || "",
          pool: metricData.marketPoolName || "",
          type: metricData.isLong ? "Long" : "Short",
          orderType: metricData.orderType === OrderType.MarketIncrease ? "Market" : "Limit",
          tradeType: metricData.hasExistingPosition ? "IncreaseSize" : "InitialTrade",
          leverage: metricData.leverage || "",
          is1CT: metricData.is1ct,
          chain: getChainName(chainId),
          isFirstOrder: metricData.isFirstOrder ?? false,
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
          pair: metricData.marketIndexName || "",
          pool: metricData.marketPoolName || "",
          type: metricData.isLong ? "Long" : "Short",
          orderType: metricData.orderType === OrderType.MarketDecrease ? "Market" : "TPSL",
          tradeType: metricData.isFullClose ? "ClosePosition" : "DecreaseSize",
          leverage: "",
          is1CT: metricData.is1ct,
          chain: getChainName(chainId),
          isFirstOrder: false,
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
          orderType: metricData.orderType === OrderType.MarketSwap ? "Market" : "Limit",
          tradeType: "InitialTrade",
          leverage: "",
          is1CT: metricData.is1ct,
          chain: getChainName(chainId),
          isFirstOrder: false,
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

  const isUserError = Boolean(prepareErrorMetricData(error)?.isUserError);

  switch (metricData.metricType) {
    case "increasePosition":
      userAnalytics.pushEvent<TradeBoxResultEvent>({
        event: "TradeBoxAction",
        data: {
          action: isSuccess ? "IncreasePositionSuccess" : "IncreasePositionFail",
          pair: metricData.marketIndexName || "",
          pool: metricData.marketPoolName || "",
          type: metricData.isLong ? "Long" : "Short",
          orderType: metricData.orderType === OrderType.MarketIncrease ? "Market" : "Limit",
          tradeType: metricData.hasExistingPosition ? "IncreaseSize" : "InitialTrade",
          leverage: metricData.leverage || "",
          is1CT: metricData.is1ct,
          chain: getChainName(chainId),
          isFirstOrder: metricData.isFirstOrder ?? false,
          isLeverageEnabled: Boolean(metricData.isLeverageEnabled),
          isUserError,
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
          pair: metricData.marketIndexName || "",
          pool: metricData.marketPoolName || "",
          type: metricData.isLong ? "Long" : "Short",
          orderType: metricData.orderType === OrderType.MarketDecrease ? "Market" : "TPSL",
          tradeType: metricData.isFullClose ? "ClosePosition" : "DecreaseSize",
          leverage: "",
          is1CT: metricData.is1ct,
          chain: getChainName(chainId),
          isFirstOrder: false,
          isLeverageEnabled: false,
          isUserError,
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
          orderType: metricData.orderType === OrderType.MarketSwap ? "Market" : "Limit",
          tradeType: "InitialTrade",
          leverage: "",
          is1CT: metricData.is1ct,
          chain: getChainName(chainId),
          isFirstOrder: metricData.isFirstOrder ?? false,
          isLeverageEnabled: false,
          isUserError,
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
