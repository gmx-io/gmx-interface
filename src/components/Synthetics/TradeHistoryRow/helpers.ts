import CustomErrors from "abis/CustomErrors.json";
import { t } from "@lingui/macro";
import words from "lodash/words";
import { StatsTooltipRowProps } from "components/StatsTooltip/StatsTooltipRow";
import { OrderType, isIncreaseOrderType } from "domain/synthetics/orders";
import { formatAcceptablePrice } from "domain/synthetics/positions";
import { convertToUsd } from "domain/synthetics/tokens";
import { getShouldUseMaxPrice, getTriggerThresholdType } from "domain/synthetics/trade";
import { PositionTradeAction, TradeAction, TradeActionType } from "domain/synthetics/tradeHistory";
import { BigNumber, ethers } from "ethers";
import { PRECISION } from "lib/legacy";
import { formatTokenAmount, formatTokenAmountWithUsd, formatUsd } from "lib/numbers";
import { museNeverExist } from "lib/types";

type FormatPositionMessageChunk = {
  text: string;
  textRed?: boolean;
  tooltipRows?: StatsTooltipRowProps[];
  tooltipTitle?: string;
  tooltipTitleRed?: boolean;
  tooltipFooterRed?: boolean;
  tooltipFooter?: string;
};
type FormatPositionMessageResult = FormatPositionMessageChunk[] | null;

export function getOrderActionText(tradeAction: TradeAction) {
  let actionText = "";

  if (tradeAction.eventName === TradeActionType.OrderCreated) {
    actionText = t`Create`;
  }

  if (tradeAction.eventName === TradeActionType.OrderCancelled) {
    actionText = t`Cancel`;
  }

  if (tradeAction.eventName === TradeActionType.OrderExecuted) {
    actionText = t`Execute`;
  }

  if (tradeAction.eventName === TradeActionType.OrderUpdated) {
    actionText = t`Update`;
  }

  if (tradeAction.eventName === TradeActionType.OrderFrozen) {
    actionText = t`Freeze`;
  }

  return actionText;
}

export const formatPositionMessage = (
  tradeAction: PositionTradeAction,
  minCollateralUsd: BigNumber
): FormatPositionMessageResult => {
  const indexToken = tradeAction.indexToken;
  const priceDecimals = tradeAction.indexToken.priceDecimals;
  const collateralToken = tradeAction.initialCollateralToken;
  const sizeDeltaUsd = tradeAction.sizeDeltaUsd;
  const collateralDeltaAmount = tradeAction.initialCollateralDeltaAmount;

  const isIncrease = isIncreaseOrderType(tradeAction.orderType);
  const increaseText = isIncrease ? t`Increase` : t`Decrease`;
  const longText = tradeAction.isLong ? t`Long` : t`Short`;
  const positionText = `${longText} ${indexToken.symbol}`;
  const sizeDeltaText = `${isIncrease ? "+" : "-"}${formatUsd(sizeDeltaUsd)}`;

  switch (tradeAction.orderType) {
    case OrderType.LimitIncrease:
    case OrderType.LimitSwap:
    case OrderType.LimitDecrease:
    case OrderType.StopLossDecrease: {
      const triggerPrice = tradeAction.triggerPrice;
      const executionPrice = tradeAction.executionPrice;
      const pricePrefix = getTriggerThresholdType(tradeAction.orderType!, tradeAction.isLong!);
      const actionText = getOrderActionText(tradeAction);
      const tokenPrice = getTokenPriceByTradeAction(tradeAction);

      if (tradeAction.eventName === TradeActionType.OrderExecuted) {
        const executeOrderStr = t`Execute Order: ${increaseText} ${positionText} ${sizeDeltaText},`;
        return [
          {
            text: `${executeOrderStr} `,
          },
          {
            text: [
              t`Triggered at: ${formatUsd(tokenPrice, { displayDecimals: priceDecimals })}`,
              t`Execution Price: ${formatUsd(executionPrice, { displayDecimals: priceDecimals })}`,
            ].join(", "),
            tooltipRows: [
              {
                label: t`Order trigger price`,
                showDollar: false,
                value: formatUsd(triggerPrice, { displayDecimals: priceDecimals }),
              },
              tradeAction.orderType === OrderType.StopLossDecrease
                ? undefined
                : {
                    label: t`Acceptable Price`,
                    showDollar: false,
                    value: formatAcceptablePrice(tradeAction.acceptablePrice, {
                      displayDecimals: priceDecimals,
                    }),
                  },

              tradeAction.priceImpactUsd && {
                label: t`Price Impact`,
                showDollar: false,
                value: formatUsd(tradeAction.priceImpactUsd, { displayDecimals: priceDecimals }),
              },
            ].filter(Boolean) as StatsTooltipRowProps[],
          },
        ];
      }

      const isFailed = tradeAction.eventName === TradeActionType.OrderFrozen;
      const prefix = isFailed ? "Execution Failed" : `${actionText} Order`;

      const mainStr = `${prefix}: ${increaseText} ${positionText} ${sizeDeltaText}`;
      const triggerPriceStr = t`Trigger Price: ${pricePrefix} ${formatUsd(triggerPrice, {
        displayDecimals: priceDecimals,
      })}`;
      const acceptablePriceStr = t`Acceptable Price: ${formatAcceptablePrice(tradeAction.acceptablePrice, {
        displayDecimals: priceDecimals,
      })}`;

      const isTakeProfit = tradeAction.orderType === OrderType.LimitDecrease;
      const shouldRenderAcceptablePrice = isTakeProfit || isIncrease;

      if (isFailed) {
        const strs = [triggerPriceStr];

        if (shouldRenderAcceptablePrice) {
          strs.push(acceptablePriceStr);
        }

        return [
          { text: `${mainStr}`, ...getFrozenTooltipProps(tradeAction), textRed: true },
          { text: `, ${strs.join(", ")}` },
        ];
      } else {
        const strs = [mainStr, triggerPriceStr];

        if (shouldRenderAcceptablePrice) {
          strs.push(acceptablePriceStr);
        }

        return [{ text: strs.join(", ") }];
      }
    }

    case OrderType.MarketDecrease:
    case OrderType.MarketIncrease:
    case OrderType.MarketSwap: {
      let actionText = {
        [TradeActionType.OrderCreated]: t`Request`,
        [TradeActionType.OrderExecuted]: "",
        [TradeActionType.OrderCancelled]: t`Cancel`,
        [TradeActionType.OrderUpdated]: t`Update`,
        [TradeActionType.OrderFrozen]: t`Freeze`,
      }[tradeAction.eventName!];

      if (sizeDeltaUsd?.gt(0)) {
        const pricePrefix =
          tradeAction.eventName === TradeActionType.OrderExecuted ? t`Execution Price` : t`Acceptable Price`;
        const price =
          tradeAction.eventName === TradeActionType.OrderExecuted
            ? tradeAction.executionPrice
            : tradeAction.acceptablePrice;

        return [
          {
            text: t`${actionText} ${increaseText} ${positionText} ${sizeDeltaText}, ${pricePrefix}: ${formatAcceptablePrice(
              price,
              {
                displayDecimals: priceDecimals,
              }
            )}`,
          },
        ];
      } else {
        const collateralText = formatTokenAmount(
          collateralDeltaAmount,
          collateralToken.decimals,
          collateralToken.symbol
        );

        if (isIncrease) {
          return [{ text: t`${actionText} Deposit ${collateralText} into ${positionText}` }];
        } else {
          return [{ text: t`${actionText} Withdraw ${collateralText} from ${positionText}` }];
        }
      }
    }

    case OrderType.Liquidation: {
      if (tradeAction.eventName === TradeActionType.OrderExecuted) {
        const executionPrice = tradeAction.executionPrice;
        const maxLeverage = PRECISION.div(tradeAction.marketInfo.minCollateralFactor);
        const maxLeverageText = Number(maxLeverage).toFixed(1) + "x";
        return [
          {
            text: "Liquidated",
            tooltipTitle: t`This position was liquidated as the max leverage of ${maxLeverageText} was exceeded.`,
            tooltipRows: getLiquidationTooltipProps(tradeAction, minCollateralUsd),
          },
          {
            text: t`${positionText} ${sizeDeltaText}, Execution Price: ${formatUsd(executionPrice, {
              displayDecimals: priceDecimals,
            })}`,
          },
        ];
      }

      return null;
    }

    default: {
      museNeverExist(tradeAction.orderType);
    }
  }

  return null;
};

function getTokenPriceByTradeAction(tradeAction: PositionTradeAction) {
  return getShouldUseMaxPrice(isIncreaseOrderType(tradeAction.orderType), tradeAction.isLong)
    ? tradeAction.indexTokenPriceMax
    : tradeAction.indexTokenPriceMin;
}

function getLiquidationTooltipProps(
  tradeAction: PositionTradeAction,
  minCollateralUsd: BigNumber
): StatsTooltipRowProps[] {
  const {
    initialCollateralToken,
    initialCollateralDeltaAmount,
    collateralTokenPriceMin,
    borrowingFeeAmount,
    fundingFeeAmount,
    positionFeeAmount,
    pnlUsd,
    priceImpactUsd,
  } = tradeAction;

  const initialCollateralUsd = convertToUsd(
    initialCollateralDeltaAmount,
    initialCollateralToken?.decimals,
    collateralTokenPriceMin
  );

  const positionFeeUsd = convertToUsd(positionFeeAmount, initialCollateralToken?.decimals, collateralTokenPriceMin);
  const borrowingFeeUsd = convertToUsd(borrowingFeeAmount, initialCollateralToken?.decimals, collateralTokenPriceMin);
  const fundingFeeUsd = convertToUsd(fundingFeeAmount, initialCollateralToken?.decimals, collateralTokenPriceMin);

  return [
    {
      label: t`Mark Price`,
      showDollar: false,
      value: formatUsd(getTokenPriceByTradeAction(tradeAction)),
    },
    {
      label: t`Initial collateral`,
      showDollar: false,
      value: formatTokenAmountWithUsd(
        initialCollateralDeltaAmount,
        initialCollateralUsd,
        initialCollateralToken?.symbol,
        initialCollateralToken?.decimals
      ),
    },
    { label: t`Min required collateral`, showDollar: false, value: formatUsd(minCollateralUsd) },
    { label: t`Borrow Fee`, showDollar: false, value: formatUsd(borrowingFeeUsd) },
    { label: t`Funding Fee`, showDollar: false, value: formatUsd(fundingFeeUsd) },
    { label: t`Position Fee`, showDollar: false, value: formatUsd(positionFeeUsd) },
    // FIXME do we still want to show priceImpactDiffUsd?
    { label: t`Price Impact`, showDollar: false, value: formatUsd(priceImpactUsd) },
    { label: t`PnL`, showDollar: false, value: formatUsd(pnlUsd) },
  ];
}

function getFrozenTooltipProps(tradeAction: PositionTradeAction): Partial<FormatPositionMessageChunk> {
  const customErrors = new ethers.Contract(ethers.constants.AddressZero, CustomErrors.abi);

  if (!tradeAction.reasonBytes) return {};

  let error: ReturnType<typeof customErrors.interface.parseError> | null = null;
  try {
    error = customErrors.interface.parseError(tradeAction.reasonBytes);
  } catch (err) {
    return {};
  }

  if (!error) return {};

  let tooltipTitle = `Reason: ${words(error.name).join(" ").toLowerCase()}`;

  switch (error.name) {
    case "OrderNotFulfillableAtAcceptablePrice": {
      tooltipTitle =
        "The Execution Price didn't meet the Acceptable Price condition. The Order will get filled when the condition is met.";
      break;
    }

    case "InsufficientReserveForOpenInterest": {
      tooltipTitle =
        "Not enough Available Liquidity to fill the Order. The Order will get filled when the condition is met and there is enough Available Liquidity.";
      break;
    }

    case "InsufficientSwapOutputAmount": {
      tooltipTitle =
        "Not enough Available Swap Liquidity to fill the Order. The Order will get filled when the condition is met and there is enough Available Swap Liquidity.";
      break;
    }
  }

  return {
    tooltipTitle,
    tooltipTitleRed: true,
  };
}
