import { getChainName } from "config/chains";
import { OrderType } from "domain/synthetics/orders";
import { metrics } from "lib/metrics";
import { OrderMetricData, OrderMetricId } from "lib/metrics/types";
import { userAnalytics } from "lib/userAnalytics";
import { ConnectWalletClickEvent, TradeBoxConfirmClickEvent, TradeBoxResultEvent } from "lib/userAnalytics/types";

export function sendUserAnalyticsConnectWalletClickEvent(position: ConnectWalletClickEvent["data"]["position"]) {
  userAnalytics.pushEvent<ConnectWalletClickEvent>({
    event: "ConnectWalletAction",
    data: {
      action: "ConnectWalletClick",
      position,
    },
  });
}

export function sendUserAnalyticsTradeBoxConfirmClickEvent(chainId: number, metricId: OrderMetricId) {
  let metricData = metrics.getCachedMetricData<OrderMetricData>(metricId);

  if (!metricData) {
    metrics.pushError("Order metric data not found", "sendUserAnalyticsTradeBoxConfirmClickEvent");
    return;
  }

  if (metricData.metricType === "increasePosition") {
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
        isFirstOrder: metricData.isFirstOrder || true,
      },
    });
  } else if (metricData.metricType === "decreasePosition") {
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
  } else if (metricData.metricType === "swap") {
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
  }
}

export function sendUserAnalyticsTradeBoxResultEvent(chainId: number, metricId: OrderMetricId, isSuccess: boolean) {
  let metricData = metrics.getCachedMetricData<OrderMetricData>(metricId);

  if (!metricData) {
    metrics.pushError("Order metric data not found", "sendUserAnalyticsTradeBoxPositionResultEvent");
    return;
  }

  if (metricData.metricType === "increasePosition") {
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
        isFirstOrder: metricData.isFirstOrder || true,
      },
    });
  } else if (metricData.metricType === "decreasePosition") {
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
      },
    });
  } else if (metricData.metricType === "swap") {
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
        isFirstOrder: false,
      },
    });
  }
}

export function makeUserAnalyticsTradeboxFailResultHandler(chainId: number, metricId: OrderMetricId) {
  return (error: Error) => {
    sendUserAnalyticsTradeBoxResultEvent(chainId, metricId, false);
    throw error;
  };
}
