import { i18n } from "@lingui/core";
import { t } from "@lingui/macro";
import { BigNumber, ethers } from "ethers";

import { getMarketFullName, getMarketIndexName } from "domain/synthetics/markets";
import { OrderType, isIncreaseOrderType } from "domain/synthetics/orders";
import { convertToUsd } from "domain/synthetics/tokens/utils";
import { getShouldUseMaxPrice } from "domain/synthetics/trade";
import { PositionTradeAction, TradeActionType } from "domain/synthetics/tradeHistory";
import { PRECISION } from "lib/legacy";
import { formatDeltaUsd, formatTokenAmount, formatTokenAmountWithUsd, formatUsd } from "lib/numbers";

import { actionTextMap, getActionTitle } from "../../keys";
import { RowDetails, formatTradeActionTimestamp, lines, numberToState } from "./shared";

import CustomErrors from "abis/CustomErrors.json";

type MakeOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

const customErrors = new ethers.Contract(ethers.constants.AddressZero, CustomErrors.abi);

function tryGetError(
  reasonBytes: ethers.utils.Bytes
): ReturnType<typeof customErrors.interface.parseError> | undefined {
  let error: ReturnType<typeof customErrors.interface.parseError> | undefined;

  try {
    error = customErrors.interface.parseError(reasonBytes);
  } catch {
    return undefined;
  }

  return error;
}

export const formatPositionMessage = (
  tradeAction: PositionTradeAction,
  minCollateralUsd: BigNumber,
  relativeTimestamp = true
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

  const formattedAcceptablePrice = formatUsd(tradeAction.acceptablePrice);

  const action = getActionTitle(tradeAction.orderType, tradeAction.eventName);
  const timestamp = formatTradeActionTimestamp(tradeAction.transaction.timestamp, relativeTimestamp);
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
  const ev = tradeAction.eventName;

  //#region MarketIncrease
  if (ot === OrderType.MarketIncrease && ev === TradeActionType.OrderCreated) {
    const customAction = sizeDeltaUsd.gt(0) ? action : i18n._(actionTextMap["Deposit-OrderCreated"]!);
    const customSize = sizeDeltaUsd.gt(0) ? sizeDeltaText : formattedCollateralDelta;
    const customPrice = "<  " + formattedAcceptablePrice!;
    const priceComment = lines(t`Acceptable price for the order.`);

    result = {
      action: customAction,
      size: customSize,
      price: customPrice,
      priceComment,
    };
  } else if (ot === OrderType.MarketIncrease && ev === TradeActionType.OrderExecuted) {
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
  } else if (ot === OrderType.MarketIncrease && ev === TradeActionType.OrderFrozen) {
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
    (ot === OrderType.LimitIncrease && ev === TradeActionType.OrderCreated) ||
    (ot === OrderType.LimitIncrease && ev === TradeActionType.OrderUpdated) ||
    (ot === OrderType.LimitIncrease && ev === TradeActionType.OrderCancelled)
  ) {
    const customPrice = "<  " + formatUsd(tradeAction.triggerPrice)!;

    result = {
      price: customPrice,
      priceComment: lines(t`Trigger price for the order.`, "", [
        t`Order Acceptable Price`,
        ": < ",
        formattedAcceptablePrice!,
      ]),
    };
  } else if (ot === OrderType.LimitIncrease && ev === TradeActionType.OrderExecuted) {
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
  } else if (ot === OrderType.LimitIncrease && ev === TradeActionType.OrderFrozen) {
    let error = tradeAction.reasonBytes && tryGetError(tradeAction.reasonBytes);

    result = {
      priceComment: lines(
        t`Mark price for the order.`,
        "",
        [t`Order Acceptable Price`, ": < ", formattedAcceptablePrice!],
        error?.args?.price && [t`Order Execution Price`, ": ", formatUsd(error.args.price)]
      ),
    };
    //#endregion LimitIncrease
    //#region MarketDecrease
  } else if (ot === OrderType.MarketDecrease && ev === TradeActionType.OrderCreated) {
    const customAction = sizeDeltaUsd.gt(0) ? action : i18n._(actionTextMap["Withdraw-OrderCreated"]!);
    const customSize = sizeDeltaUsd.gt(0) ? sizeDeltaText : formattedCollateralDelta;
    const customPrice = ">  " + formattedAcceptablePrice!;
    const priceComment = lines(t`Acceptable price for the order.`);

    result = {
      action: customAction,
      size: customSize,
      price: customPrice,
      priceComment,
    };
  } else if (ot === OrderType.MarketDecrease && ev === TradeActionType.OrderCancelled) {
    const customAction = sizeDeltaUsd.gt(0) ? action : i18n._(actionTextMap["Withdraw-OrderCreated"]!);
    const customSize = sizeDeltaUsd.gt(0) ? sizeDeltaText : formattedCollateralDelta;
    const customPrice = ">  " + formattedAcceptablePrice!;
    const priceComment = lines(t`Acceptable price for the order.`);

    result = {
      action: customAction,
      size: customSize,
      price: customPrice,
      priceComment,
    };
  } else if (ot === OrderType.MarketDecrease && ev === TradeActionType.OrderExecuted) {
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
  } else if (ot === OrderType.MarketDecrease && ev === TradeActionType.OrderFrozen) {
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
    (ot === OrderType.LimitDecrease && ev === TradeActionType.OrderCreated) ||
    (ot === OrderType.LimitDecrease && ev === TradeActionType.OrderUpdated) ||
    (ot === OrderType.LimitDecrease && ev === TradeActionType.OrderCancelled)
  ) {
    const customPrice = ">  " + formatUsd(tradeAction.triggerPrice)!;

    result = {
      price: customPrice,
      priceComment: lines(t`Trigger price for the order.`, "", [
        t`Order Acceptable Price`,
        ": > ",
        formattedAcceptablePrice!,
      ]),
    };
  } else if (ot === OrderType.LimitDecrease && ev === TradeActionType.OrderExecuted) {
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
  } else if (ot === OrderType.LimitDecrease && ev === TradeActionType.OrderFrozen) {
    let error = tradeAction.reasonBytes && tryGetError(tradeAction.reasonBytes);

    result = {
      priceComment: lines(
        t`Mark price for the order.`,
        "",
        [t`Order Acceptable Price`, ": > ", formattedAcceptablePrice!],
        error?.args?.price && [t`Order Execution Price`, ": ", formatUsd(error.args.price)]
      ),
    };
    //#endregion LimitDecrease
    //#region StopLossDecrease
  } else if (
    (ot === OrderType.StopLossDecrease && ev === TradeActionType.OrderCreated) ||
    (ot === OrderType.StopLossDecrease && ev === TradeActionType.OrderUpdated) ||
    (ot === OrderType.StopLossDecrease && ev === TradeActionType.OrderCancelled)
  ) {
    const customPrice = "<  " + formatUsd(tradeAction.triggerPrice)!;

    result = {
      price: customPrice,
      priceComment: lines(t`Trigger price for the order.`, "", [
        t`Order Acceptable Price`,
        ": < ",
        formattedAcceptablePrice!,
      ]),
    };
  } else if (ot === OrderType.StopLossDecrease && ev === TradeActionType.OrderExecuted) {
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
  } else if (ot === OrderType.StopLossDecrease && ev === TradeActionType.OrderFrozen) {
    let error = tradeAction.reasonBytes && tryGetError(tradeAction.reasonBytes);

    result = {
      priceComment: lines(
        t`Mark price for the order.`,
        "",
        [t`Order Acceptable Price`, ": < ", formattedAcceptablePrice!],
        error?.args?.price && [t`Order Execution Price`, ": ", formatUsd(error.args.price)]
      ),
    };

    //#endregion StopLossDecrease
    //#region Liquidation
  } else if (ot === OrderType.Liquidation && ev === TradeActionType.OrderCreated) {
    //
  } else if (ot === OrderType.Liquidation && ev === TradeActionType.OrderExecuted) {
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
