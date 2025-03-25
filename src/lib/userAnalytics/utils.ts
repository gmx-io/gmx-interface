import debounce from "lodash/debounce";

import { getChainName } from "config/chains";
import { USD_DECIMALS } from "config/factors";
import { OrderType } from "domain/synthetics/orders";
import { TradeMode, TradeType } from "domain/synthetics/trade";
import { formatAmountForMetrics, formatPercentageForMetrics, metrics } from "lib/metrics";
import { OrderMetricData, OrderMetricId } from "lib/metrics/types";
import { bigintToNumber, formatRatePercentage, roundToOrder } from "lib/numbers";
import { parseError } from "lib/parseError";
import { userAnalytics } from "lib/userAnalytics";
import {
  ConnectWalletClickEvent,
  PoolsPageBuyConfirmEvent,
  PoolsPageBuyResultEvent,
  TradeBoxConfirmClickEvent,
  TradeBoxInteractionStartedEvent,
  TradeBoxResultEvent,
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
          orderType: metricData.orderType === OrderType.MarketIncrease ? "Market" : "Limit",
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
          orderType: metricData.orderType === OrderType.MarketDecrease ? "Market" : "TPSL",
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
          amountUsd: metricData.amountUsd,
          leverage: "",
          is1CT: metricData.is1ct,
          chain: getChainName(chainId),
          isFirstOrder: metricData.isFirstOrder ?? false,
          interactionId: undefined,
          priceImpactDeltaUsd: undefined,
          priceImpactPercentage: undefined,
          netRate1h: undefined,
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
          orderType: metricData.orderType === OrderType.MarketIncrease ? "Market" : "Limit",
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
          orderType: metricData.orderType === OrderType.MarketDecrease ? "Market" : "TPSL",
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
