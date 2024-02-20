import { i18n } from "@lingui/core";
import { t } from "@lingui/macro";
import { BigNumber } from "ethers";

import { getMarketFullName, getMarketIndexName } from "domain/synthetics/markets";
import { OrderType, isIncreaseOrderType, isLimitOrderType } from "domain/synthetics/orders";
import { formatAcceptablePrice, getTriggerNameByOrderType } from "domain/synthetics/positions/utils";
import { convertToUsd } from "domain/synthetics/tokens/utils";
import { getShouldUseMaxPrice } from "domain/synthetics/trade";
import { PositionTradeAction, TradeActionType } from "domain/synthetics/tradeHistory";
import { formatDateTime } from "lib/dates";
import { PRECISION } from "lib/legacy";
import { formatDeltaUsd, formatTokenAmount, formatTokenAmountWithUsd, formatUsd } from "lib/numbers";
import { museNeverExist } from "lib/types";
import { RowDetails, getOrderActionText, lines, numberToState } from "./shared";

type MakeOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

type OrderTypes = keyof typeof OrderType;

const actionTextMap: Partial<Record<`${OrderTypes | "Deposit" | "Withdraw"}-${TradeActionType}`, string>> = {
  "MarketSwap-OrderCreated": /*i18n*/ "Request Market Swap",
  "MarketSwap-OrderExecuted": /*i18n*/ "Execute Market Swap",
  "MarketSwap-OrderFrozen": /*i18n*/ "Failed Market Swap",

  "LimitSwap-OrderCreated": /*i18n*/ "Create Limit Swap",
  "LimitSwap-OrderExecuted": /*i18n*/ "Execute Limit Swap",
  "LimitSwap-OrderCancelled": /*i18n*/ "Cancel Limit Swap",
  "LimitSwap-OrderUpdated": /*i18n*/ "Update Limit Swap",
  "LimitSwap-OrderFrozen": /*i18n*/ "Failed Limit Swap",

  "MarketIncrease-OrderCreated": /*i18n*/ "Request Market Increase",
  "MarketIncrease-OrderExecuted": /*i18n*/ "Market Increase",
  "MarketIncrease-OrderFrozen": /*i18n*/ "Failed Market Increase",

  "LimitIncrease-OrderCreated": /*i18n*/ "Create Limit Order",
  "LimitIncrease-OrderExecuted": /*i18n*/ "Execute Limit Order",
  "LimitIncrease-OrderCancelled": /*i18n*/ "Cancel Limit Order",
  "LimitIncrease-OrderUpdated": /*i18n*/ "Update Limit Order",
  "LimitIncrease-OrderFrozen": /*i18n*/ "Failed Limit Order",

  "MarketDecrease-OrderCreated": /*i18n*/ "Request Market Decrease",
  "MarketDecrease-OrderExecuted": /*i18n*/ "Market Decrease",
  "MarketDecrease-OrderFrozen": /*i18n*/ "Failed Market Decrease",

  "LimitDecrease-OrderCreated": /*i18n*/ "Create Take-Profit Order",
  "LimitDecrease-OrderExecuted": /*i18n*/ "Execute Take-Profit Order",
  "LimitDecrease-OrderCancelled": /*i18n*/ "Cancel Take-Profit Order",
  "LimitDecrease-OrderUpdated": /*i18n*/ "Update Take-Profit Order",
  "LimitDecrease-OrderFrozen": /*i18n*/ "Failed Take-Profit Order",

  "StopLossDecrease-OrderCreated": /*i18n*/ "Create Stop-Loss Order",
  "StopLossDecrease-OrderExecuted": /*i18n*/ "Execute Stop-Loss Order",
  "StopLossDecrease-OrderCancelled": /*i18n*/ "Cancel Stop-Loss Order",
  "StopLossDecrease-OrderUpdated": /*i18n*/ "Update Stop-Loss Order",
  "StopLossDecrease-OrderFrozen": /*i18n*/ "Failed Stop-Loss Order",

  "Liquidation-OrderExecuted": /*i18n*/ "Liquidated",

  "Deposit-OrderCreated": /*i18n*/ "Request Deposit",
  "Deposit-OrderExecuted": /*i18n*/ "Deposit",
  "Deposit-OrderFrozen": /*i18n*/ "Failed Deposit",

  "Withdraw-OrderCreated": /*i18n*/ "Request Withdraw",
  "Withdraw-OrderExecuted": /*i18n*/ "Withdraw",
  "Withdraw-OrderFrozen": /*i18n*/ "Failed Withdraw",
};

function orderTypeToKey(orderType: OrderType): keyof typeof OrderType {
  switch (orderType) {
    case OrderType.MarketSwap:
      return "MarketSwap";
    case OrderType.LimitSwap:
      return "LimitSwap";
    case OrderType.MarketIncrease:
      return "MarketIncrease";
    case OrderType.LimitIncrease:
      return "LimitIncrease";
    case OrderType.MarketDecrease:
      return "MarketDecrease";
    case OrderType.LimitDecrease:
      return "LimitDecrease";
    case OrderType.StopLossDecrease:
      return "StopLossDecrease";
    case OrderType.Liquidation:
      return "Liquidation";
  }

  museNeverExist(orderType as never);
}

function getActionTitle(orderType: OrderType, eventName: TradeActionType) {
  const title = actionTextMap[`${orderTypeToKey(orderType)}-${eventName}`];

  if (title) {
    return i18n._(title);
  }

  const fallbackOrderTypeName = isLimitOrderType(orderType) ? "Limit" : getTriggerNameByOrderType(orderType);

  return `${getOrderActionText(eventName)} ${fallbackOrderTypeName}`;
}

export const formatPositionMessage = (
  tradeAction: PositionTradeAction,
  minCollateralUsd: BigNumber
): RowDetails | null => {
  const collateralToken = tradeAction.initialCollateralToken;
  const sizeDeltaUsd = tradeAction.sizeDeltaUsd;
  const collateralDeltaAmount = tradeAction.initialCollateralDeltaAmount;

  const isIncrease = isIncreaseOrderType(tradeAction.orderType);
  const longShortText = tradeAction.isLong ? t`Long` : t`Short`;
  const sign = isIncrease ? "+" : "-";
  const sizeDeltaText = `${sign}${formatUsd(sizeDeltaUsd)}`;

  const indexName = getMarketIndexName({
    indexToken: tradeAction.indexToken,
    isSpotOnly: tradeAction.marketInfo.isSpotOnly,
  });

  const fullMarket = getMarketFullName({
    indexToken: tradeAction.indexToken,
    longToken: tradeAction.marketInfo.longToken,
    shortToken: tradeAction.marketInfo.shortToken,
    isSpotOnly: tradeAction.marketInfo.isSpotOnly,
  });

  const marketPrice = getTokenPriceByTradeAction(tradeAction);
  const formattedMarketPrice = formatUsd(marketPrice)!;

  const formattedAcceptablePrice = formatAcceptablePrice(tradeAction.acceptablePrice);

  const action = getActionTitle(tradeAction.orderType, tradeAction.eventName);
  const timestamp = formatDateTime(tradeAction.transaction.timestamp);
  const market = `${longShortText} ${indexName}`;

  const formattedCollateralDelta = formatTokenAmount(
    collateralDeltaAmount,
    collateralToken.decimals,
    collateralToken.symbol,
    {
      useCommas: true,
    }
  );

  const formattedExecutionPrice = formatUsd(tradeAction.executionPrice);
  const formattedPriceImpact = formatDeltaUsd(tradeAction.priceImpactUsd);

  let result: MakeOptional<RowDetails, "action" | "market" | "timestamp" | "price" | "size">;

  const ot = tradeAction.orderType;
  const at = tradeAction.eventName;

  //#region MarketIncrease
  if (ot === OrderType.MarketIncrease && at === TradeActionType.OrderCreated) {
    const customAction = sizeDeltaUsd.gt(0) ? action : i18n._(actionTextMap["Deposit-OrderCreated"]!);
    const customSize = sizeDeltaUsd.gt(0) ? sizeDeltaText : formattedCollateralDelta;
    const customPrice = "< " + formattedAcceptablePrice!;
    const priceComment = lines(t`Acceptable price for the order.`);

    result = {
      action: customAction,
      size: customSize,
      price: customPrice,
      priceComment,
    };
  } else if (ot === OrderType.MarketIncrease && at === TradeActionType.OrderExecuted) {
    const customAction = sizeDeltaUsd.gt(0) ? action : i18n._(actionTextMap["Deposit-OrderExecuted"]!);
    const customSize = sizeDeltaUsd.gt(0) ? sizeDeltaText : formattedCollateralDelta;
    const priceComment = sizeDeltaUsd.gt(0)
      ? lines(
          t`Mark price for the order.`,
          "",
          [t`Order Acceptable Price`, ": < ", formattedAcceptablePrice!],
          [t`Order Execution Price`, ": ", formattedExecutionPrice!],
          [t`Price Impact`, ": ", { text: formattedPriceImpact!, state: numberToState(tradeAction.priceImpactUsd!) }],
          "",
          t`Order execution price takes into account price impact.`
        )
      : lines(t`Mark price for the order.`);

    result = {
      action: customAction,
      size: customSize,
      priceComment: priceComment,
    };
  } else if (ot === OrderType.MarketIncrease && at === TradeActionType.OrderFrozen) {
    const customAction = sizeDeltaUsd.gt(0) ? action : i18n._(actionTextMap["Deposit-OrderFrozen"]!);
    const customSize = sizeDeltaUsd.gt(0) ? sizeDeltaText : formattedCollateralDelta;

    const priceComment = sizeDeltaUsd.gt(0)
      ? lines(t`Mark price for the order.`, "", [t`Order Acceptable Price`, ": < ", formattedAcceptablePrice!])
      : lines(t`Mark price for the order.`);

    result = {
      action: customAction,
      size: customSize,
      priceComment,
    };
    //#endregion MarketIncrease
    //#region LimitIncrease
  } else if (
    (ot === OrderType.LimitIncrease && at === TradeActionType.OrderCreated) ||
    (ot === OrderType.LimitIncrease && at === TradeActionType.OrderUpdated) ||
    (ot === OrderType.LimitIncrease && at === TradeActionType.OrderCancelled)
  ) {
    const customPrice = "< " + formatUsd(tradeAction.triggerPrice)!;

    result = {
      price: customPrice,
      priceComment: lines(t`Trigger price for the order.`, "", [
        t`Order Acceptable Price`,
        ": < ",
        formattedAcceptablePrice!,
      ]),
    };
  } else if (ot === OrderType.LimitIncrease && at === TradeActionType.OrderExecuted) {
    result = {
      priceComment: lines(
        t`Mark price for the order.`,
        "",
        [t`Order Acceptable Price`, ": < ", formattedAcceptablePrice!],
        [t`Order Execution Price`, ": ", formattedExecutionPrice!],
        [t`Price Impact`, ": ", { text: formattedPriceImpact!, state: numberToState(tradeAction.priceImpactUsd!) }],
        "",
        t`Order execution price takes into account price impact.`
      ),
    };
  } else if (ot === OrderType.LimitIncrease && at === TradeActionType.OrderFrozen) {
    result = {
      priceComment: lines(t`Mark price for the order.`, "", [
        t`Order Acceptable Price`,
        ": < ",
        formattedAcceptablePrice!,
      ]),
    };
    //#endregion LimitIncrease
    //#region MarketDecrease
  } else if (ot === OrderType.MarketDecrease && at === TradeActionType.OrderCreated) {
    const customAction = sizeDeltaUsd.gt(0) ? action : i18n._(actionTextMap["Withdraw-OrderCreated"]!);
    const customSize = sizeDeltaUsd.gt(0) ? sizeDeltaText : formattedCollateralDelta;
    const customPrice = "> " + formattedAcceptablePrice!;
    const priceComment = lines(t`Acceptable price for the order.`);

    result = {
      action: customAction,
      size: customSize,
      price: customPrice,
      priceComment,
    };
  } else if (ot === OrderType.MarketDecrease && at === TradeActionType.OrderExecuted) {
    const customAction = sizeDeltaUsd.gt(0) ? action : i18n._(actionTextMap["Withdraw-OrderExecuted"]!);
    const customSize = sizeDeltaUsd.gt(0) ? sizeDeltaText : formattedCollateralDelta;

    result = {
      action: customAction,
      size: customSize,
      priceComment: lines(
        t`Mark price for the order.`,
        "",
        [t`Order Acceptable Price`, ": > ", formattedAcceptablePrice!],
        [t`Order Execution Price`, ": ", formattedExecutionPrice!],
        [t`Price Impact`, ": ", { text: formattedPriceImpact!, state: numberToState(tradeAction.priceImpactUsd!) }],
        "",
        t`Order execution price takes into account price impact.`
      ),
    };
  } else if (ot === OrderType.MarketDecrease && at === TradeActionType.OrderFrozen) {
    const customAction = sizeDeltaUsd.gt(0) ? action : i18n._(actionTextMap["Withdraw-OrderFrozen"]!);
    const customSize = sizeDeltaUsd.gt(0) ? sizeDeltaText : formattedCollateralDelta;

    result = {
      action: customAction,
      size: customSize,
      priceComment: lines(t`Mark price for the order.`, "", [
        t`Order Acceptable Price`,
        ": > ",
        formattedAcceptablePrice!,
      ]),
    };
    //#endregion MarketDecrease
    //#region LimitDecrease
  } else if (
    (ot === OrderType.LimitDecrease && at === TradeActionType.OrderCreated) ||
    (ot === OrderType.LimitDecrease && at === TradeActionType.OrderUpdated) ||
    (ot === OrderType.LimitDecrease && at === TradeActionType.OrderCancelled)
  ) {
    const customPrice = "> " + formatUsd(tradeAction.triggerPrice)!;

    result = {
      price: customPrice,
      priceComment: lines(t`Trigger price for the order.`, "", [
        t`Order Acceptable Price`,
        ": > ",
        formattedAcceptablePrice!,
      ]),
    };
  } else if (ot === OrderType.LimitDecrease && at === TradeActionType.OrderExecuted) {
    result = {
      priceComment: lines(
        t`Mark price for the order.`,
        "",
        [t`Order Acceptable Price`, ": > ", formattedAcceptablePrice!],
        [t`Order Execution Price`, ": ", formattedExecutionPrice!],
        [t`Price Impact`, ": ", { text: formattedPriceImpact!, state: numberToState(tradeAction.priceImpactUsd!) }],
        "",
        t`Order execution price takes into account price impact.`
      ),
    };
  } else if (ot === OrderType.LimitDecrease && at === TradeActionType.OrderFrozen) {
    result = {
      priceComment: lines(t`Mark price for the order.`, "", [
        t`Order Acceptable Price`,
        ": > ",
        formattedAcceptablePrice!,
      ]),
    };
    //#endregion LimitDecrease
    //#region StopLossDecrease
  } else if (
    (ot === OrderType.StopLossDecrease && at === TradeActionType.OrderCreated) ||
    (ot === OrderType.StopLossDecrease && at === TradeActionType.OrderUpdated) ||
    (ot === OrderType.StopLossDecrease && at === TradeActionType.OrderCancelled)
  ) {
    const customPrice = "< " + formatUsd(tradeAction.triggerPrice)!;

    result = {
      price: customPrice,
      priceComment: lines(t`Trigger price for the order.`, "", [
        t`Order Acceptable Price`,
        ": < ",
        formattedAcceptablePrice!,
      ]),
    };
  } else if (ot === OrderType.StopLossDecrease && at === TradeActionType.OrderExecuted) {
    result = {
      priceComment: lines(
        t`Mark price for the order.`,
        "",
        [t`Order Acceptable Price`, ": < ", formattedAcceptablePrice!],
        [t`Order Execution Price`, ": ", formattedExecutionPrice!],
        [t`Price Impact`, ": ", { text: formattedPriceImpact!, state: numberToState(tradeAction.priceImpactUsd!) }],
        "",
        t`Order execution price takes into account price impact.`
      ),
    };
  } else if (ot === OrderType.StopLossDecrease && at === TradeActionType.OrderFrozen) {
    result = {
      priceComment: lines(t`Mark price for the order.`, "", [
        t`Order Acceptable Price`,
        ": < ",
        formattedAcceptablePrice!,
      ]),
    };

    //#endregion StopLossDecrease
    //#region Liquidation
  } else if (ot === OrderType.Liquidation && at === TradeActionType.OrderExecuted) {
    const maxLeverage = PRECISION.div(tradeAction.marketInfo.minCollateralFactor);
    const formattedMaxLeverage = Number(maxLeverage).toFixed(1) + "x";

    const initialCollateralUsd = convertToUsd(
      tradeAction.initialCollateralDeltaAmount,
      tradeAction.initialCollateralToken?.decimals,
      tradeAction.collateralTokenPriceMin
    );

    const formattedInitialCollateral = formatTokenAmountWithUsd(
      tradeAction.initialCollateralDeltaAmount,
      initialCollateralUsd,
      tradeAction.initialCollateralToken?.symbol,
      tradeAction.initialCollateralToken?.decimals
    );

    const formattedPnl = formatUsd(tradeAction.pnlUsd)!;
    const formattedBasePnl = formatUsd(tradeAction.basePnlUsd)!;

    const borrowingFeeUsd = convertToUsd(
      tradeAction.borrowingFeeAmount,
      tradeAction.initialCollateralToken?.decimals,
      tradeAction.collateralTokenPriceMin
    );
    const formattedBorrowFee = formatUsd(borrowingFeeUsd?.mul(-1))!;

    const fundingFeeUsd = convertToUsd(
      tradeAction.fundingFeeAmount,
      tradeAction.initialCollateralToken?.decimals,
      tradeAction.collateralTokenPriceMin
    );
    const formattedFundingFee = formatUsd(fundingFeeUsd?.mul(-1))!;

    const positionFeeUsd = convertToUsd(
      tradeAction.positionFeeAmount,
      tradeAction.initialCollateralToken?.decimals,
      tradeAction.collateralTokenPriceMin
    );
    const formattedPositionFee = formatUsd(positionFeeUsd?.mul(-1))!;

    const formattedMinCollateral = formatUsd(minCollateralUsd)!;

    result = {
      priceComment: lines(
        t`Mark price for the liquidation.`,
        "",
        t`This position was liquidated as the max. leverage of ${formattedMaxLeverage} was exceeded when taking into account fees.`,
        "",
        [t`Order Execution Price`, ": ", formattedExecutionPrice!],
        t`Order execution price takes into account price impact.`,
        "",
        [t`Initial Collateral`, ": ", formattedInitialCollateral!],
        [
          t`PnL`,
          ": ",
          {
            text: formattedBasePnl,
            state: numberToState(tradeAction.pnlUsd!),
          },
        ],
        [t`Borrow Fee`, ": ", { text: formattedBorrowFee, state: "error" }],
        [t`Funding Fee`, ": ", { text: formattedFundingFee, state: "error" }],
        [t`Position Fee`, ": ", { text: formattedPositionFee, state: "error" }],
        [t`Price Impact`, ": ", { text: formattedPriceImpact!, state: numberToState(tradeAction.priceImpactUsd!) }],
        "",
        [t`PnL after Fees and Price Impact`, ": ", { text: formattedPnl, state: numberToState(tradeAction.pnlUsd!) }],
        "",
        [t`Leftover Collateral`, ": ", formattedMinCollateral],
        [t`Min. required Collateral`, ": ", formattedMinCollateral]
      ),
    };
    //#endregion Liquidation
  }

  return {
    action,
    market,
    fullMarket,
    timestamp,
    price: formattedMarketPrice,
    size: sizeDeltaText,
    ...result!,
  };
};

function getTokenPriceByTradeAction(tradeAction: PositionTradeAction) {
  return getShouldUseMaxPrice(isIncreaseOrderType(tradeAction.orderType), tradeAction.isLong)
    ? tradeAction.indexTokenPriceMax
    : tradeAction.indexTokenPriceMin;
}
