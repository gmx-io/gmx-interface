import { Trans, t } from "@lingui/macro";

import { Token } from "domain/tokens";
import { formatPercentage, formatTokenAmount, formatUsd } from "lib/numbers";
import { getTokenVisualMultiplier } from "sdk/configs/tokens";
import {
  isDecreaseOrderType,
  isIncreaseOrderType,
  isOrderForPosition,
  isSwapOrder,
  isSwapOrderType,
  isTwapOrder,
  isTwapSwapOrder,
} from "sdk/utils/orders";

import ExternalLink from "components/ExternalLink/ExternalLink";

import { getFeeItem, getIsHighPriceImpact, getPriceImpactByAcceptablePrice } from "../fees";
import { MarketsInfoData, getAvailableUsdLiquidityForPosition } from "../markets";
import { PositionInfo, PositionsInfoData, getLeverage } from "../positions";
import { convertToTokenAmount, convertToUsd } from "../tokens";
import { FindSwapPath, getAcceptablePriceInfo, getMaxSwapPathLiquidity, getSwapAmountsByFromValue } from "../trade";
import { OrderError, OrderInfo, OrderType, PositionOrderInfo, SwapOrderInfo, TwapOrderInfo } from "./types";
import { getIsMaxLeverageExceeded } from "../trade/utils/validation";

export function getSwapOrderTitle(p: {
  initialCollateralToken: Token;
  targetCollateralToken: Token;
  initialCollateralAmount: bigint;
  minOutputAmount: bigint;
}) {
  const { initialCollateralToken, initialCollateralAmount, targetCollateralToken, minOutputAmount } = p;

  const fromTokenText = formatTokenAmount(
    initialCollateralAmount,
    initialCollateralToken.decimals,
    initialCollateralToken.symbol
  );

  const toTokenText = formatTokenAmount(minOutputAmount, targetCollateralToken.decimals, targetCollateralToken.symbol);

  return t`Swap ${fromTokenText} for ${toTokenText}`;
}

export function getPositionOrderTitle(p: {
  orderType: OrderType;
  isLong: boolean;
  indexToken: Token;
  sizeDeltaUsd: bigint;
}) {
  const { orderType, isLong, indexToken, sizeDeltaUsd } = p;

  const longShortText = isLong ? t`Long` : t`Short`;
  const visualMultiplier = getTokenVisualMultiplier(indexToken);
  const tokenText = `${visualMultiplier}${indexToken.symbol} ${longShortText}`;
  const sizeText = formatUsd(sizeDeltaUsd);
  const increaseOrDecreaseText = isIncreaseOrderType(orderType) ? t`Increase` : t`Decrease`;

  return t`${increaseOrDecreaseText} ${tokenText} by ${sizeText}`;
}

export function getOrderTypeLabel(orderType: OrderType) {
  const orderTypeLabels = {
    [OrderType.MarketSwap]: t`Market Swap`,
    [OrderType.LimitSwap]: t`Limit Swap`,
    [OrderType.MarketIncrease]: t`Market Increase`,
    [OrderType.LimitIncrease]: t`Limit Increase`,
    [OrderType.MarketDecrease]: t`Market Decrease`,
    [OrderType.LimitDecrease]: t`Limit Decrease`,
    [OrderType.StopLossDecrease]: t`Stop Loss Decrease`,
    [OrderType.Liquidation]: t`Liquidation`,
  };

  return orderTypeLabels[orderType];
}

export function setOrderInfoTitle(order: OrderInfo, indexToken?: Token) {
  let title: string | undefined = undefined;

  if (isSwapOrderType(order.orderType)) {
    title = getSwapOrderTitle({
      initialCollateralToken: order.initialCollateralToken,
      targetCollateralToken: order.targetCollateralToken,
      initialCollateralAmount: order.initialCollateralDeltaAmount,
      minOutputAmount: order.minOutputAmount,
    });
  } else {
    title = indexToken
      ? getPositionOrderTitle({
          orderType: order.orderType,
          isLong: order.isLong,
          indexToken,
          sizeDeltaUsd: order.sizeDeltaUsd,
        })
      : undefined;
  }

  if (title) {
    order.title = title;
  }

  return order;
}

export function getOrderErrors(p: {
  order: OrderInfo;
  marketsInfoData: MarketsInfoData;
  positionsInfoData: PositionsInfoData | undefined;
  findSwapPath: FindSwapPath;
  uiFeeFactor: bigint;
}): { errors: OrderError[]; level: "error" | "warning" | undefined } {
  const { order, positionsInfoData, marketsInfoData } = p;

  const errors: OrderError[] = [];

  if (isTwapOrder(order)) {
    if (isIncreaseOrderType(order.orderType) || isSwapOrderType(order.orderType)) {
      const positionOrder = order as TwapOrderInfo<PositionOrderInfo>;
      const currentLiquidity = isTwapSwapOrder(order)
        ? getMaxSwapPathLiquidity({
            marketsInfoData,
            swapPath: order.swapPath,
            initialCollateralAddress: order.initialCollateralTokenAddress,
          })
        : getAvailableUsdLiquidityForPosition(positionOrder.marketInfo, positionOrder.isLong);

      const orderWithValidFromTimeExceeded = order.orders.find(
        (order) => order.validFromTime < BigInt(Math.floor(Date.now() / 1000))
      );

      if (currentLiquidity < order.sizeDeltaUsd) {
        if (orderWithValidFromTimeExceeded) {
          errors.push({
            msg: t`Parts of this order will be executed once there is sufficient liquidity.`,
            level: "error",
            key: "twap-liquidity1",
          });
        } else {
          errors.push({
            msg: t`There may not be enough liquidity to execute parts of this order when the time conditions are met.`,
            level: "error",
            key: "twap-liquidity2",
          });
        }
      }
    }
  } else {
    if (isSwapOrder(order)) {
      const swapPathLiquidity = getMaxSwapPathLiquidity({
        marketsInfoData,
        swapPath: order.swapPath,
        initialCollateralAddress: order.initialCollateralTokenAddress,
      });

      const minOutputUsd = convertToUsd(
        order.minOutputAmount,
        order.targetCollateralToken.decimals,
        order.targetCollateralToken.prices.maxPrice
      )!;

      if (swapPathLiquidity < minOutputUsd && !isTwapOrder(order)) {
        errors.push({
          msg: t`There may not be sufficient liquidity to execute the swap when the min. receive conditions are met.`,
          level: "error",
          key: "liquidity0",
        });
      }

      const swapImpactFeeItem = getFeeItem(
        order.swapPathStats?.totalSwapPriceImpactDeltaUsd,
        convertToUsd(
          order.initialCollateralDeltaAmount,
          order.initialCollateralToken.decimals,
          order.initialCollateralToken.prices.maxPrice
        )
      );

      if (getIsHighPriceImpact(undefined, swapImpactFeeItem)) {
        errors.push({
          msg: t`There is currently a high swap price impact for the order swap path.`,
          level: "warning",
          key: "highPriceImpact",
        });
      }
    }

    const positionOrder = order as PositionOrderInfo;

    const position = Object.values(positionsInfoData || {}).find((pos) => isOrderForPosition(positionOrder, pos.key));

    if ([OrderType.LimitDecrease, OrderType.LimitIncrease].includes(positionOrder.orderType) && !isTwapOrder(order)) {
      const { acceptablePriceDeltaBps: currentAcceptablePriceDeltaBps } = getAcceptablePriceInfo({
        marketInfo: positionOrder.marketInfo,
        isIncrease: isIncreaseOrderType(positionOrder.orderType),
        isLong: positionOrder.isLong,
        indexPrice: positionOrder.triggerPrice,
        sizeDeltaUsd: positionOrder.sizeDeltaUsd,
      });

      const { acceptablePriceDeltaBps: orderAcceptablePriceDeltaBps } = getPriceImpactByAcceptablePrice({
        sizeDeltaUsd: positionOrder.sizeDeltaUsd,
        isIncrease: isIncreaseOrderType(positionOrder.orderType),
        isLong: positionOrder.isLong,
        indexPrice: positionOrder.triggerPrice,
        acceptablePrice: positionOrder.acceptablePrice,
      });

      if (currentAcceptablePriceDeltaBps < 0 && currentAcceptablePriceDeltaBps < orderAcceptablePriceDeltaBps) {
        const priceText = positionOrder.orderType === OrderType.LimitIncrease ? t`limit price` : t`trigger price`;
        const formattedCurrentAcceptablePriceImpact = formatPercentage(currentAcceptablePriceDeltaBps, {
          signed: true,
        });
        const formattedOrderAcceptablePriceImpact = formatPercentage(orderAcceptablePriceDeltaBps, {
          signed: true,
        });

        errors.push({
          msg: t`The order may not execute at the desired ${priceText} as its acceptable price impact is set to ${formattedOrderAcceptablePriceImpact}, which is lower than the current market price impact of ${formattedCurrentAcceptablePriceImpact}. It can be edited using the "Edit" button.`,
          level: "warning",
          key: "acceptablePrice",
        });
      }
    }

    if (positionOrder.orderType === OrderType.LimitIncrease && !isTwapOrder(order)) {
      const currentLiquidity = getAvailableUsdLiquidityForPosition(positionOrder.marketInfo, positionOrder.isLong);

      if (currentLiquidity < positionOrder.sizeDeltaUsd) {
        errors.push({
          msg: t`There may not be sufficient liquidity to execute your order when the price conditions are met.`,
          level: "error",
          key: "liquidity1",
        });
      }

      if (positionOrder.swapPathStats?.swapPath.length) {
        const swapPathLiquidity = getMaxSwapPathLiquidity({
          marketsInfoData,
          swapPath: positionOrder.swapPath,
          initialCollateralAddress: positionOrder.initialCollateralTokenAddress,
        });

        const collateralSwapUsd = convertToUsd(
          order.initialCollateralDeltaAmount,
          order.initialCollateralToken.decimals,
          order.initialCollateralToken.prices.maxPrice
        )!;

        if (swapPathLiquidity < collateralSwapUsd) {
          errors.push({
            msg: t`There may not be sufficient liquidity to execute the pay token to collateral token swap when the price conditions are met.`,
            level: "error",
            key: "liquidity2",
          });
        }
      }
    }

    if (!position) {
      const collateralSymbol = order.targetCollateralToken.symbol;
      const sameMarketPosition = Object.values(positionsInfoData || {}).find(
        (pos) => pos.marketAddress === order.marketAddress && pos.isLong === order.isLong
      );

      const symbol = sameMarketPosition?.collateralToken.symbol;
      const longText = sameMarketPosition?.isLong ? t`long` : t`short`;

      if (sameMarketPosition) {
        errors.push({
          msg: t`This order using ${collateralSymbol} as collateral will not be valid for the existing ${longText} position using ${symbol} as collateral.`,
          level: "warning",
          key: "collateralToken",
        });
      }
    }

    if (isDecreaseOrderType(order.orderType) && position) {
      const triggerPrice = (order as PositionOrderInfo).triggerPrice;

      const isInvalidTriggerPrice = position.isLong
        ? position.liquidationPrice === undefined
          ? undefined
          : position.liquidationPrice > triggerPrice
        : position.liquidationPrice === undefined
          ? undefined
          : position.liquidationPrice < triggerPrice;

      if (isInvalidTriggerPrice) {
        errors.push({
          msg: t`The order will not be executed as its trigger price is beyond the position's liquidation price.`,
          level: "error",
          key: "triggerPrice",
        });
      }

      if (order.swapPath.length) {
        const swapPathLiquidity = getMaxSwapPathLiquidity({
          marketsInfoData,
          swapPath: positionOrder.swapPath,
          initialCollateralAddress: positionOrder.initialCollateralTokenAddress,
        });

        const minOutputUsd = convertToUsd(
          order.minOutputAmount,
          order.targetCollateralToken.decimals,
          order.targetCollateralToken.prices.maxPrice
        )!;

        if (swapPathLiquidity < minOutputUsd) {
          errors.push({
            msg: t`There may not be sufficient liquidity to execute the swap to the receive token when the price conditions are met.`,
            level: "error",
            key: "swapPath",
          });
        }
      }
    }

    if (isIncreaseOrderType(order.orderType)) {
      const isMaxLeverageError = getIsMaxLeverageError(positionOrder, position, p.findSwapPath, p.uiFeeFactor);

      if (isMaxLeverageError) {
        errors.push({
          msg: (
            <Trans>
              The order may not execute as the max.&nbsp;allowed&nbsp;leverage is exceeded. Consider decreasing the
              order's leverage by editing and decreasing its size.{" "}
              <ExternalLink href="https://docs.gmx.io/docs/trading/v2/#max-leverage">Read more</ExternalLink>.
            </Trans>
          ),
          key: "maxLeverage",
          level: "error",
        });
      }
    }
  }

  const errorsLevelPriority = {
    error: 1,
    warning: 2,
  };

  let level: "error" | "warning" | undefined = undefined;
  if (errors.some((err) => err.level === "error")) {
    level = "error";
  } else if (errors.some((err) => err.level === "warning")) {
    level = "warning";
  }

  return {
    errors: errors.sort((a, b) => {
      return errorsLevelPriority[a.level] - errorsLevelPriority[b.level];
    }),
    level,
  };
}

function getTokenIndex(token: Token, referenceArray: string[]): number {
  return referenceArray.indexOf(
    token.wrappedAddress && referenceArray.includes(token.wrappedAddress) ? token.wrappedAddress : token.address
  );
}

export function sortPositionOrders(
  orders: (PositionOrderInfo | TwapOrderInfo<PositionOrderInfo>)[],
  tokenSortOrder?: string[]
): (PositionOrderInfo | TwapOrderInfo<PositionOrderInfo>)[] {
  return orders.sort((a, b) => {
    if (tokenSortOrder) {
      const indexA = getTokenIndex(a.marketInfo.indexToken, tokenSortOrder);
      const indexB = getTokenIndex(b.marketInfo.indexToken, tokenSortOrder);
      if (indexA !== indexB) return indexA - indexB;
    } else {
      const nameComparison = a.marketInfo.name.localeCompare(b.marketInfo.name);
      if (nameComparison) return nameComparison;
    }

    // Compare by trigger price
    const triggerPriceComparison = a.triggerPrice - b.triggerPrice;
    if (triggerPriceComparison !== 0n) return triggerPriceComparison < 0 ? -1 : 1;

    // Compare by order type
    const orderTypeComparison = a.orderType - b.orderType;
    if (orderTypeComparison) return orderTypeComparison;

    // Finally, sort by size delta USD
    return b.sizeDeltaUsd - a.sizeDeltaUsd < 0 ? -1 : 1;
  });
}

export function sortSwapOrders(
  orders: (SwapOrderInfo | TwapOrderInfo<SwapOrderInfo>)[],
  tokenSortOrder?: string[]
): (SwapOrderInfo | TwapOrderInfo<SwapOrderInfo>)[] {
  return orders.sort((a, b) => {
    if (tokenSortOrder) {
      const indexA = getTokenIndex(a.targetCollateralToken, tokenSortOrder);
      const indexB = getTokenIndex(b.targetCollateralToken, tokenSortOrder);
      if (indexA !== indexB) return indexA - indexB;
    } else {
      const collateralComparison = a.targetCollateralToken.symbol.localeCompare(b.targetCollateralToken.symbol);
      if (collateralComparison) return collateralComparison;
    }

    return a.minOutputAmount - b.minOutputAmount < 0 ? -1 : 1;
  });
}

function getIsMaxLeverageError(
  order: PositionOrderInfo,
  position: PositionInfo | undefined,
  findSwapPath: FindSwapPath,
  uiFeeFactor: bigint
) {
  const swapAmounts = getSwapAmountsByFromValue({
    tokenIn: order.initialCollateralToken,
    tokenOut: order.targetCollateralToken,
    amountIn: order.initialCollateralDeltaAmount,
    isLimit: false,
    findSwapPath,
    uiFeeFactor,
  });
  const markPrice = order.marketInfo.indexToken.prices.minPrice;
  const sizeDeltaUsd = order.sizeDeltaUsd;
  const sizeDeltaInTokens = convertToTokenAmount(sizeDeltaUsd, order.marketInfo.indexToken.decimals, markPrice);

  if (sizeDeltaInTokens === undefined) return false;

  const isLong = order.isLong;
  const marketInfo = order.marketInfo;

  const collateralDeltaAmount = swapAmounts.amountOut;
  const collateralDeltaUsd = convertToUsd(
    collateralDeltaAmount,
    order.targetCollateralToken.decimals,
    order.targetCollateralToken.prices.minPrice
  );

  if (collateralDeltaUsd === undefined) return false;

  const leverage = getLeverage({
    sizeInUsd: order.sizeDeltaUsd + (position?.sizeInUsd ?? 0n),
    collateralUsd: collateralDeltaUsd + (position?.collateralUsd ?? 0n),
    pnl: undefined,
    pendingBorrowingFeesUsd: 0n,
    pendingFundingFeesUsd: 0n,
  });

  if (leverage === undefined) return false;

  return getIsMaxLeverageExceeded(leverage, marketInfo, isLong, sizeDeltaUsd);
}
