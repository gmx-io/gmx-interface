import { i18n } from "@lingui/core";
import { t } from "@lingui/macro";

import { isBoundaryAcceptablePrice } from "domain/prices";
import { getMarketFullName, getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import { OrderType, isDecreaseOrderType, isIncreaseOrderType, isLiquidationOrderType } from "domain/synthetics/orders";
import { convertToUsd, parseContractPrice } from "domain/synthetics/tokens/utils";
import { getShouldUseMaxPrice } from "domain/synthetics/trade";
import {
  BN_NEGATIVE_ONE,
  BN_ONE,
  PRECISION,
  applyFactor,
  calculateDisplayDecimals,
  formatDeltaUsd,
  formatTokenAmount,
  formatTokenAmountWithUsd,
  formatUsd,
} from "lib/numbers";
import { PositionTradeAction, TradeActionType } from "sdk/types/tradeHistory";
import { bigMath } from "sdk/utils/bigmath";

import {
  INEQUALITY_GT,
  INEQUALITY_LT,
  Line,
  MakeOptional,
  RowDetails,
  formatTradeActionTimestamp,
  formatTradeActionTimestampISO,
  getErrorTooltipTitle,
  infoRow,
  lines,
  numberToState,
  tryGetError,
} from "./shared";
import { actionTextMap, getActionTitle } from "../../keys";

export const formatPositionMessage = (
  tradeAction: PositionTradeAction,
  minCollateralUsd: bigint,
  relativeTimestamp = true
): RowDetails => {
  const collateralToken = tradeAction.initialCollateralToken;
  const isV22Action = tradeAction.srcChainId !== undefined;

  let sizeDeltaUsd = tradeAction.sizeDeltaUsd;

  if (
    tradeAction.twapParams &&
    (tradeAction.eventName === TradeActionType.OrderCreated || tradeAction.eventName === TradeActionType.OrderCancelled)
  ) {
    sizeDeltaUsd = tradeAction.sizeDeltaUsd * BigInt(tradeAction.twapParams.numberOfParts);
  }

  const collateralDeltaAmount = tradeAction.initialCollateralDeltaAmount;
  const marketPriceDecimals = calculateDisplayDecimals(
    tradeAction.indexToken.prices.minPrice,
    undefined,
    tradeAction.indexToken.visualMultiplier
  );

  const ot = tradeAction.orderType;
  const ev = tradeAction.eventName;

  const isIncrease = isIncreaseOrderType(tradeAction.orderType);
  const isLong = tradeAction.isLong;
  const longShortText = isLong ? t`Long` : t`Short`;
  const indexTokenSymbol = tradeAction.indexToken.symbol;

  //          | long | short
  // increase |  <   |  >
  // decrease |  >   |  <
  let acceptablePriceInequality: string;
  if (isIncrease && isLong) {
    acceptablePriceInequality = INEQUALITY_LT;
  } else if (isIncrease && !isLong) {
    acceptablePriceInequality = INEQUALITY_GT;
  } else if (!isIncrease && isLong) {
    acceptablePriceInequality = INEQUALITY_GT;
  } else {
    acceptablePriceInequality = INEQUALITY_LT;
  }

  //         | long | short
  // limit   |  <   |  >
  // stop    |  >   |  <
  // tp      |  >   |  <
  // sl      |  <   |  >
  let triggerPriceInequality = "";
  if (ot === OrderType.LimitIncrease && isLong) {
    triggerPriceInequality = INEQUALITY_LT;
  } else if (ot === OrderType.LimitIncrease && !isLong) {
    triggerPriceInequality = INEQUALITY_GT;
  } else if (ot === OrderType.StopIncrease && isLong) {
    triggerPriceInequality = INEQUALITY_GT;
  } else if (ot === OrderType.StopIncrease && !isLong) {
    triggerPriceInequality = INEQUALITY_LT;
  } else if (ot === OrderType.LimitDecrease && isLong) {
    triggerPriceInequality = INEQUALITY_GT;
  } else if (ot === OrderType.LimitDecrease && !isLong) {
    triggerPriceInequality = INEQUALITY_LT;
  } else if (ot === OrderType.StopLossDecrease && isLong) {
    triggerPriceInequality = INEQUALITY_LT;
  } else if (ot === OrderType.StopLossDecrease && !isLong) {
    triggerPriceInequality = INEQUALITY_GT;
  }

  const sizeDeltaText = formatUsd(sizeDeltaUsd * (isIncrease ? BN_ONE : BN_NEGATIVE_ONE), {
    displayPlus: true,
  })!;

  const indexName = getMarketIndexName({
    indexToken: tradeAction.indexToken,
    isSpotOnly: tradeAction.marketInfo.isSpotOnly,
  });
  const poolName = getMarketPoolName({
    longToken: tradeAction.marketInfo.longToken,
    shortToken: tradeAction.marketInfo.shortToken,
  });

  const fullMarket = getMarketFullName({
    indexToken: tradeAction.indexToken,
    longToken: tradeAction.marketInfo.longToken,
    shortToken: tradeAction.marketInfo.shortToken,
    isSpotOnly: tradeAction.marketInfo.isSpotOnly,
  });

  const marketPrice = getTokenPriceByTradeAction(tradeAction);
  const formattedMarketPrice = formatUsd(marketPrice, {
    displayDecimals: marketPriceDecimals,
    visualMultiplier: tradeAction.indexToken.visualMultiplier,
  });

  const formattedAcceptablePrice = formatUsd(tradeAction.acceptablePrice, {
    displayDecimals: marketPriceDecimals,
    visualMultiplier: tradeAction.indexToken.visualMultiplier,
  })!;
  const formattedTriggerPrice = formatUsd(tradeAction.triggerPrice, {
    displayDecimals: marketPriceDecimals,
    visualMultiplier: tradeAction.indexToken.visualMultiplier,
  })!;

  const action = getActionTitle(tradeAction.orderType, tradeAction.eventName, Boolean(tradeAction.twapParams));
  const timestamp = formatTradeActionTimestamp(tradeAction.timestamp, relativeTimestamp);
  const timestampISO = formatTradeActionTimestampISO(tradeAction.timestamp);

  const market = `${longShortText} ${indexName}`;

  const formattedCollateralDelta = formatTokenAmount(
    collateralDeltaAmount,
    collateralToken.decimals,
    collateralToken.symbol,
    {
      useCommas: true,
      displayDecimals: calculateDisplayDecimals(
        collateralDeltaAmount,
        collateralToken.decimals,
        undefined,
        collateralToken.isStable
      ),
      isStable: collateralToken.isStable,
    }
  );

  const formattedExecutionPrice = formatUsd(tradeAction.executionPrice, {
    displayDecimals: marketPriceDecimals,
    visualMultiplier: tradeAction.indexToken.visualMultiplier,
  });

  const priceImpactLines = getPriceImpactLines(tradeAction);

  let displayedPriceImpact: string | undefined = undefined;
  if (isIncreaseOrderType(ot) && !isV22Action) {
    displayedPriceImpact = formatDeltaUsd(tradeAction.priceImpactUsd);
  } else if (isDecreaseOrderType(ot) && isV22Action && tradeAction.totalImpactUsd !== undefined) {
    displayedPriceImpact = formatDeltaUsd(tradeAction.totalImpactUsd);
  }

  let result: MakeOptional<RowDetails, "action" | "market" | "timestamp" | "timestampISO" | "price" | "size">;

  //#region MarketIncrease
  if (ot === OrderType.MarketIncrease && ev === TradeActionType.OrderCreated) {
    const customAction = sizeDeltaUsd > 0 ? action : i18n._(actionTextMap["Deposit-OrderCreated"]!);
    const customSize = sizeDeltaUsd > 0 ? sizeDeltaText : formattedCollateralDelta;
    const customPrice = acceptablePriceInequality + formattedAcceptablePrice;
    const priceComment = lines(t`Acceptable price for the order.`);

    result = {
      action: customAction,
      size: customSize,
      price: customPrice,
      priceComment,
      acceptablePrice: customPrice,
    };
  } else if (ot === OrderType.MarketIncrease && ev === TradeActionType.OrderExecuted) {
    const customAction = sizeDeltaUsd > 0 ? action : i18n._(actionTextMap["Deposit-OrderExecuted"]!);
    const customSize = sizeDeltaUsd > 0 ? sizeDeltaText : formattedCollateralDelta;

    const priceComment =
      sizeDeltaUsd > 0 && priceImpactLines.length > 0
        ? lines(t`Mark price for the order.`, "", ...priceImpactLines)
        : lines(t`Mark price for the order.`);

    result = {
      action: customAction,
      size: customSize,
      priceComment: priceComment,
      acceptablePrice: acceptablePriceInequality + formattedAcceptablePrice,
    };
  } else if (ot === OrderType.MarketIncrease && ev === TradeActionType.OrderCancelled) {
    const customAction = sizeDeltaUsd > 0 ? action : i18n._(actionTextMap["Deposit-OrderCancelled"]!);
    const customSize = sizeDeltaUsd > 0 ? sizeDeltaText : formattedCollateralDelta;
    const customPrice = acceptablePriceInequality + formattedAcceptablePrice;
    const error = tradeAction.reasonBytes ? tryGetError(tradeAction.reasonBytes) ?? undefined : undefined;
    const priceComment = lines(
      t`Acceptable price for the order.`,
      error?.args?.price && "",
      error?.args?.price &&
        infoRow(
          t`Order Execution Price`,
          formatUsd(parseContractPrice(error.args.price, tradeAction.indexToken.decimals), {
            displayDecimals: marketPriceDecimals,
            visualMultiplier: tradeAction.indexToken.visualMultiplier,
          })
        )
    );

    result = {
      action: customAction,
      actionComment:
        error &&
        lines({
          text: getErrorTooltipTitle(error.name, true),
          state: "error",
        }),
      size: customSize,
      price: customPrice,
      priceComment,
      acceptablePrice: acceptablePriceInequality + formattedAcceptablePrice,
      isActionError: true,
    };
    //#endregion MarketIncrease
    //#region Twap
  } else if (tradeAction.twapParams) {
    if (ev === TradeActionType.OrderExecuted) {
      const formattedPnl = sizeDeltaUsd > 0n ? formatUsd(tradeAction.pnlUsd) : undefined;

      result = {
        priceComment: lines(
          t`Mark price for the order.`,
          "",
          infoRow(t`Order Trigger Price`, t`N/A`),
          ...priceImpactLines
        ),
        acceptablePrice: t`N/A`,
        pnl: formattedPnl,
        pnlState: numberToState(tradeAction.pnlUsd),
      };
    } else {
      const error = tradeAction.reasonBytes ? tryGetError(tradeAction.reasonBytes) ?? undefined : undefined;
      const errorComment = error
        ? lines({
            text: getErrorTooltipTitle(error.name, false),
            state: "error",
          })
        : undefined;

      const errorActionComment =
        ev === TradeActionType.OrderFrozen || ev === TradeActionType.OrderCancelled ? errorComment : undefined;
      result = {
        price: t`N/A`, // ----
        priceComment: null,
        actionComment: errorActionComment,
        isActionError: Boolean(errorActionComment),
      };
    }
    //#endregion Twap
    //#region LimitIncrease and StopIncrease
  } else if (
    ((ot === OrderType.LimitIncrease || ot === OrderType.StopIncrease) && ev === TradeActionType.OrderCreated) ||
    ((ot === OrderType.LimitIncrease || ot === OrderType.StopIncrease) && ev === TradeActionType.OrderUpdated) ||
    ((ot === OrderType.LimitIncrease || ot === OrderType.StopIncrease) && ev === TradeActionType.OrderCancelled)
  ) {
    const customPrice =
      triggerPriceInequality +
      formatUsd(tradeAction.triggerPrice, {
        displayDecimals: marketPriceDecimals,
        visualMultiplier: tradeAction.indexToken.visualMultiplier,
      })!;

    const isAcceptablePriceUseful = !isBoundaryAcceptablePrice(tradeAction.acceptablePrice);

    result = {
      price: customPrice,
      priceComment: lines(t`Trigger price for the order.`),
      triggerPrice: customPrice,
      acceptablePrice: isAcceptablePriceUseful ? acceptablePriceInequality + formattedAcceptablePrice : undefined,
    };
  } else if (
    (ot === OrderType.LimitIncrease && ev === TradeActionType.OrderExecuted) ||
    (ot === OrderType.StopIncrease && ev === TradeActionType.OrderExecuted)
  ) {
    const isAcceptablePriceUseful = !isBoundaryAcceptablePrice(tradeAction.acceptablePrice);

    result = {
      priceComment: lines(
        t`Mark price for the order.`,
        "",
        infoRow(t`Order Trigger Price`, triggerPriceInequality + formattedTriggerPrice),
        ...priceImpactLines
      ),
      acceptablePrice: isAcceptablePriceUseful ? acceptablePriceInequality + formattedAcceptablePrice : undefined,
    };
  } else if (
    (ot === OrderType.LimitIncrease && ev === TradeActionType.OrderFrozen) ||
    (ot === OrderType.StopIncrease && ev === TradeActionType.OrderFrozen)
  ) {
    let error = tradeAction.reasonBytes ? tryGetError(tradeAction.reasonBytes) ?? undefined : undefined;
    const isAcceptablePriceUseful = !isBoundaryAcceptablePrice(tradeAction.acceptablePrice);

    result = {
      actionComment:
        error &&
        lines({
          text: getErrorTooltipTitle(error.name, false),
          state: "error",
        }),
      priceComment: lines(
        t`Mark price for the order.`,
        "",
        infoRow(t`Order Trigger Price`, triggerPriceInequality + formattedTriggerPrice),
        isAcceptablePriceUseful
          ? infoRow(t`Order Acceptable Price`, acceptablePriceInequality + formattedAcceptablePrice)
          : undefined,
        error?.args?.price &&
          infoRow(
            t`Order Execution Price`,
            formatUsd(parseContractPrice(error.args.price, tradeAction.indexToken.decimals), {
              displayDecimals: marketPriceDecimals,
              visualMultiplier: tradeAction.indexToken.visualMultiplier,
            })
          )
      ),
      acceptablePrice: isAcceptablePriceUseful ? acceptablePriceInequality + formattedAcceptablePrice : undefined,
      isActionError: true,
    };
    //#endregion LimitIncrease and StopIncrease
    //#region MarketDecrease
  } else if (ot === OrderType.MarketDecrease && ev === TradeActionType.OrderCreated) {
    const customAction = sizeDeltaUsd > 0 ? action : i18n._(actionTextMap["Withdraw-OrderCreated"]!);
    const customSize = sizeDeltaUsd > 0 ? sizeDeltaText : formattedCollateralDelta;
    const customPrice = acceptablePriceInequality + formattedAcceptablePrice;
    const priceComment = lines(t`Acceptable price for the order.`);

    result = {
      action: customAction,
      size: customSize,
      price: customPrice,
      priceComment,
      acceptablePrice: acceptablePriceInequality + formattedAcceptablePrice,
    };
  } else if (ot === OrderType.MarketDecrease && ev === TradeActionType.OrderCancelled) {
    const customAction = sizeDeltaUsd > 0 ? action : i18n._(actionTextMap["Withdraw-OrderCreated"]!);
    const customSize = sizeDeltaUsd > 0 ? sizeDeltaText : formattedCollateralDelta;
    const customPrice = acceptablePriceInequality + formattedAcceptablePrice;
    const error = tradeAction.reasonBytes ? tryGetError(tradeAction.reasonBytes) ?? undefined : undefined;
    const priceComment = lines(
      t`Acceptable price for the order.`,
      error?.args?.price && "",
      error?.args?.price &&
        infoRow(
          t`Order Execution Price`,
          formatUsd(parseContractPrice(error.args.price, tradeAction.indexToken.decimals), {
            displayDecimals: marketPriceDecimals,
            visualMultiplier: tradeAction.indexToken.visualMultiplier,
          })
        )
    );

    result = {
      action: customAction,
      actionComment:
        error &&
        lines({
          text: getErrorTooltipTitle(error.name, true),
          state: "error",
        }),
      size: customSize,
      price: customPrice,
      priceComment,
      acceptablePrice: acceptablePriceInequality + formattedAcceptablePrice,
      isActionError: true,
    };
  } else if (ot === OrderType.MarketDecrease && ev === TradeActionType.OrderExecuted) {
    const customAction = sizeDeltaUsd > 0 ? action : i18n._(actionTextMap["Withdraw-OrderExecuted"]!);
    const customSize = sizeDeltaUsd > 0 ? sizeDeltaText : formattedCollateralDelta;

    const formattedPnl = sizeDeltaUsd > 0n ? formatUsd(tradeAction.pnlUsd) : undefined;

    result = {
      action: customAction,
      size: customSize,
      priceComment:
        priceImpactLines.length > 0
          ? lines(t`Mark price for the order.`, "", ...priceImpactLines)
          : lines(t`Mark price for the order.`),
      acceptablePrice: acceptablePriceInequality + formattedAcceptablePrice,
      pnl: formattedPnl,
      pnlState: numberToState(tradeAction.pnlUsd),
    };
    //#endregion MarketDecrease
    //#region LimitDecrease
  } else if (
    (ot === OrderType.LimitDecrease && ev === TradeActionType.OrderCreated) ||
    (ot === OrderType.LimitDecrease && ev === TradeActionType.OrderUpdated) ||
    (ot === OrderType.LimitDecrease && ev === TradeActionType.OrderCancelled)
  ) {
    const customPrice =
      triggerPriceInequality +
      formatUsd(tradeAction.triggerPrice, {
        displayDecimals: marketPriceDecimals,
        visualMultiplier: tradeAction.indexToken.visualMultiplier,
      })!;

    result = {
      price: customPrice,
      priceComment: lines(t`Trigger price for the order.`),
      triggerPrice: customPrice,
      acceptablePrice: acceptablePriceInequality + formattedAcceptablePrice,
    };
  } else if (ot === OrderType.LimitDecrease && ev === TradeActionType.OrderExecuted) {
    const formattedPnl = formatUsd(tradeAction.pnlUsd);

    result = {
      priceComment: lines(
        t`Mark price for the order.`,
        "",
        infoRow(t`Order Trigger Price`, triggerPriceInequality + formattedTriggerPrice),
        ...priceImpactLines
      ),
      acceptablePrice: acceptablePriceInequality + formattedAcceptablePrice,
      pnl: formattedPnl,
      pnlState: numberToState(tradeAction.pnlUsd),
    };
  } else if (ot === OrderType.LimitDecrease && ev === TradeActionType.OrderFrozen) {
    let error = tradeAction.reasonBytes ? tryGetError(tradeAction.reasonBytes) ?? undefined : undefined;

    result = {
      actionComment:
        error &&
        lines({
          text: getErrorTooltipTitle(error.name, false),
          state: "error",
        }),
      priceComment: lines(
        t`Mark price for the order.`,
        "",
        infoRow(t`Order Trigger Price`, triggerPriceInequality + formattedTriggerPrice),
        infoRow(t`Order Acceptable Price`, acceptablePriceInequality + formattedAcceptablePrice),
        error?.args?.price &&
          infoRow(
            t`Order Execution Price`,
            formatUsd(parseContractPrice(error.args.price, tradeAction.indexToken.decimals), {
              displayDecimals: marketPriceDecimals,
              visualMultiplier: tradeAction.indexToken.visualMultiplier,
            })
          )
      ),
      acceptablePrice: acceptablePriceInequality + formattedAcceptablePrice,
      isActionError: true,
    };
    //#endregion LimitDecrease
    //#region StopLossDecrease
  } else if (
    (ot === OrderType.StopLossDecrease && ev === TradeActionType.OrderCreated) ||
    (ot === OrderType.StopLossDecrease && ev === TradeActionType.OrderUpdated) ||
    (ot === OrderType.StopLossDecrease && ev === TradeActionType.OrderCancelled)
  ) {
    const customPrice =
      triggerPriceInequality +
      formatUsd(tradeAction.triggerPrice, {
        displayDecimals: marketPriceDecimals,
        visualMultiplier: tradeAction.indexToken.visualMultiplier,
      })!;

    result = {
      price: customPrice,
      priceComment: lines(t`Trigger price for the order.`),
      triggerPrice: customPrice,
    };
  } else if (ot === OrderType.StopLossDecrease && ev === TradeActionType.OrderExecuted) {
    const formattedPnl = formatUsd(tradeAction.pnlUsd);

    result = {
      priceComment: lines(
        t`Mark price for the order.`,
        "",
        infoRow(t`Order Trigger Price`, triggerPriceInequality + formattedTriggerPrice),
        ...priceImpactLines
      ),
      pnl: formattedPnl,
      pnlState: numberToState(tradeAction.pnlUsd),
    };
  } else if (ot === OrderType.StopLossDecrease && ev === TradeActionType.OrderFrozen) {
    let error = tradeAction.reasonBytes ? tryGetError(tradeAction.reasonBytes) ?? undefined : undefined;
    const isAcceptablePriceUseful = !isBoundaryAcceptablePrice(tradeAction.acceptablePrice);

    result = {
      actionComment:
        error &&
        lines({
          text: getErrorTooltipTitle(error.name, false),
          state: "error",
        }),
      priceComment: lines(
        t`Mark price for the order.`,
        "",
        infoRow(t`Order Trigger Price`, triggerPriceInequality + formattedTriggerPrice),
        isAcceptablePriceUseful
          ? infoRow(t`Order Acceptable Price`, acceptablePriceInequality + formattedAcceptablePrice)
          : undefined,
        error?.args?.price &&
          infoRow(
            t`Order Execution Price`,
            formatUsd(parseContractPrice(error.args.price, tradeAction.indexToken.decimals), {
              displayDecimals: marketPriceDecimals,
              visualMultiplier: tradeAction.indexToken.visualMultiplier,
            })
          )
      ),
      isActionError: true,
    };

    //#endregion StopLossDecrease
    //#region Liquidation
  } else if (ot === OrderType.Liquidation && ev === TradeActionType.OrderExecuted) {
    const maxLeverage =
      tradeAction.marketInfo.minCollateralFactorForLiquidation === 0n
        ? 0n
        : PRECISION / tradeAction.marketInfo.minCollateralFactorForLiquidation;
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
      tradeAction.initialCollateralToken?.decimals,
      {
        displayDecimals: calculateDisplayDecimals(
          tradeAction.initialCollateralDeltaAmount,
          tradeAction.initialCollateralToken?.decimals,
          undefined,
          tradeAction.initialCollateralToken?.isStable
        ),
        isStable: tradeAction.initialCollateralToken?.isStable,
      }
    );

    const formattedPnl = formatUsd(tradeAction.pnlUsd);
    const formattedBasePnl = formatUsd(tradeAction.basePnlUsd);

    const borrowingFeeUsd = convertToUsd(
      tradeAction.borrowingFeeAmount,
      tradeAction.initialCollateralToken?.decimals,
      tradeAction.collateralTokenPriceMin
    );
    const formattedBorrowFee = formatUsd(borrowingFeeUsd === undefined ? undefined : -borrowingFeeUsd);

    const fundingFeeUsd = convertToUsd(
      tradeAction.fundingFeeAmount,
      tradeAction.initialCollateralToken?.decimals,
      tradeAction.collateralTokenPriceMin
    );
    const formattedFundingFee = formatUsd(fundingFeeUsd === undefined ? undefined : -fundingFeeUsd);

    const positionFeeUsd = convertToUsd(
      tradeAction.positionFeeAmount,
      tradeAction.initialCollateralToken?.decimals,
      tradeAction.collateralTokenPriceMin
    );
    const formattedPositionFee = formatUsd(positionFeeUsd === undefined ? undefined : -positionFeeUsd);

    let liquidationCollateralUsd = applyFactor(sizeDeltaUsd, tradeAction.marketInfo.minCollateralFactorForLiquidation);
    if (liquidationCollateralUsd < minCollateralUsd) {
      liquidationCollateralUsd = minCollateralUsd;
    }

    const leftoverCollateralUsd =
      initialCollateralUsd === undefined
        ? undefined
        : initialCollateralUsd + tradeAction.basePnlUsd! - borrowingFeeUsd! - fundingFeeUsd! - positionFeeUsd!;

    const formattedLeftoverCollateral = formatUsd(leftoverCollateralUsd);
    const formattedMinCollateral = formatUsd(liquidationCollateralUsd)!;

    const liquidationFeeUsd =
      convertToUsd(
        tradeAction.liquidationFeeAmount,
        tradeAction.initialCollateralToken?.decimals,
        tradeAction.collateralTokenPriceMin
      ) ?? 0n;

    const formattedLiquidationFee = formatDeltaUsd(liquidationFeeUsd ? liquidationFeeUsd * -1n : 0n);

    let returnedCollateralUsd = 0n;

    if (
      initialCollateralUsd !== undefined &&
      tradeAction.basePnlUsd !== undefined &&
      borrowingFeeUsd !== undefined &&
      fundingFeeUsd !== undefined &&
      positionFeeUsd !== undefined &&
      liquidationFeeUsd !== undefined
    ) {
      // For v2.2+ totalImpactUsd is used
      const priceImpactUsd = tradeAction.totalImpactUsd ?? tradeAction.priceImpactUsd ?? 0n;

      returnedCollateralUsd = bigMath.max(
        0n,
        initialCollateralUsd +
          tradeAction.basePnlUsd -
          borrowingFeeUsd -
          fundingFeeUsd -
          positionFeeUsd -
          liquidationFeeUsd +
          priceImpactUsd
      );
    }

    const formattedReturnedCollateral =
      returnedCollateralUsd !== undefined ? formatUsd(returnedCollateralUsd) : undefined;

    result = {
      priceComment: lines(
        t`Mark price for the liquidation.`,
        "",
        t`This position was liquidated as the max. leverage of ${formattedMaxLeverage} was exceeded when taking into account fees.`,
        "",
        infoRow(t`Initial Collateral`, formattedInitialCollateral),
        infoRow(t`PnL`, {
          text: formattedBasePnl,
          state: numberToState(tradeAction.basePnlUsd),
        }),
        infoRow(t`Borrow Fee`, {
          text: formattedBorrowFee,
          state: "error",
        }),
        infoRow(t`Funding Fee`, {
          text: formattedFundingFee,
          state: "error",
        }),
        infoRow(t`Close Fee`, {
          text: formattedPositionFee,
          state: "error",
        }),
        "",
        infoRow(t`Min. Required Collateral`, formattedMinCollateral),
        infoRow(t`Collateral at Liquidation`, formattedLeftoverCollateral),
        "",
        ...priceImpactLines,
        infoRow(t`Liquidation Fee`, {
          text: formattedLiquidationFee,
          state: "error",
        }),
        "",
        infoRow(t`Returned Collateral`, formattedReturnedCollateral)
      ),
      isActionError: true,
      pnl: formattedPnl,
      pnlState: numberToState(tradeAction.pnlUsd),
    };
    //#endregion Liquidation
  }

  return {
    action,
    market,
    isLong,
    indexTokenSymbol,
    fullMarket,
    timestamp,
    timestampISO,
    price: formattedMarketPrice || "",
    size: sizeDeltaText,
    marketPrice: formattedMarketPrice,
    executionPrice: formattedExecutionPrice,
    priceImpact: displayedPriceImpact,
    indexName,
    poolName,
    ...result!,
  };
};

function getPriceImpactLines(tradeAction: PositionTradeAction) {
  const isV22Action = tradeAction.srcChainId !== undefined;
  const lines: Line[] = [];

  if (isLiquidationOrderType(tradeAction.orderType)) {
    if (isV22Action && tradeAction.totalImpactUsd !== undefined) {
      const formattedNetPriceImpact = formatDeltaUsd(tradeAction.totalImpactUsd);

      lines.push(
        infoRow(t`Net Price Impact`, {
          text: formattedNetPriceImpact!,
          state: numberToState(tradeAction.totalImpactUsd),
        })
      );
    } else {
      const formattedPriceImpact = formatDeltaUsd(tradeAction.priceImpactUsd);

      lines.push(
        infoRow(t`Price Impact`, {
          text: formattedPriceImpact!,
          state: numberToState(tradeAction.priceImpactUsd),
        })
      );
    }

    return lines;
  }

  if (isIncreaseOrderType(tradeAction.orderType)) {
    if (isV22Action) {
      return [];
    }

    const formattedPriceImpact = formatDeltaUsd(tradeAction.priceImpactUsd);

    lines.push(
      infoRow(t`Price Impact`, {
        text: formattedPriceImpact!,
        state: numberToState(tradeAction.priceImpactUsd),
      })
    );
  }

  if (isDecreaseOrderType(tradeAction.orderType)) {
    if (isV22Action && tradeAction.totalImpactUsd !== undefined) {
      const formattedNetPriceImpact = formatDeltaUsd(tradeAction.totalImpactUsd);

      lines.push(
        infoRow(t`Net Price Impact`, {
          text: formattedNetPriceImpact!,
          state: numberToState(tradeAction.totalImpactUsd),
        })
      );
    } else {
      const formattedPriceImpact = formatDeltaUsd(tradeAction.priceImpactUsd);

      lines.push(
        infoRow(t`Price Impact`, {
          text: formattedPriceImpact!,
          state: numberToState(tradeAction.priceImpactUsd),
        })
      );
    }
  }

  return lines;
}

export function getTokenPriceByTradeAction(tradeAction: PositionTradeAction) {
  return getShouldUseMaxPrice(isIncreaseOrderType(tradeAction.orderType), tradeAction.isLong)
    ? tradeAction.indexTokenPriceMax
    : tradeAction.indexTokenPriceMin;
}
