import { MarketsInfo } from '@/selectors/market/types';
import {
  OrderError,
  OrderInfo,
  OrderType,
  PositionOrderInfo,
} from '@/selectors/order/types';
import { PositionsInfo } from '@/selectors/position/types';
import { TokenData } from '@/selectors/token/types';
import { FindSwapPath } from '@/selectors/trade/types';
import { getFeeItem } from '@/utils/fee/getFeeItem';
import { getIsHighPriceImpact } from '@/utils/fee/getIsHighPriceImpact';
import { getPriceImpactByAcceptablePrice } from '@/utils/fee/getPriceImpactByAcceptablePrice';
import { convertTokenAmountToUsd } from '@/utils/legacy/convert';
import { formatPercentage } from '@/utils/legacy/format';
import { EMPTY_ARRAY } from '@/utils/lib/object';
import { getMarketAvailableLiquidityUsdForPosition } from '@/utils/market/getMarketAvailableLiquidityUsdForPosition';
import {
  isDecreaseOrderType,
  isIncreaseOrderType,
  isOrderForPosition,
  isSwapOrderType,
} from '@/utils/order/isOrderType';
import { getAcceptablePriceInfo } from '@/utils/tradebox/getAcceptablePriceInfo';
import { getSwapPathOfMaxLiquidity } from '@/utils/tradebox/getSwapPathOfMaxLiquidity';
import { getIsMaxLeverageError } from '@/utils/validation/getIsMaxLeverageError';
import { t } from '@lingui/macro';

export function getOrderErrors(p: {
  order: OrderInfo;
  marketsInfoData: MarketsInfo;
  positionsInfoData: PositionsInfo | undefined;
  findSwapPath: FindSwapPath;
  wrappedNativeToken: TokenData;
}): { errors: OrderError[]; level: 'error' | 'warning' | undefined } {
  const { order, positionsInfoData, marketsInfoData } = p;

  const errors: OrderError[] = [];
  let level: 'error' | 'warning' | undefined = undefined;

  if (isSwapOrderType(order.orderType)) {
    const swapPathLiquidity = getSwapPathOfMaxLiquidity({
      marketsInfo: marketsInfoData,
      swapPath: order.primarySwapPath ?? EMPTY_ARRAY,
      initialCollateralAddress: order.initialCollateralTokenAddress.toBase58(),
    });

    const minOutputUsd = convertTokenAmountToUsd(
      order.minOutputAmount,
      order.targetCollateralToken.decimals,
      order.targetCollateralToken.prices.maxPrice
    );

    if (swapPathLiquidity.lt(minOutputUsd)) {
      errors.push({
        msg: t`There may not be sufficient liquidity to execute the swap when the min. receive conditions are met.`,
        level: 'error',
        key: 'liquidity0',
      });
    }

    const swapImpactFeeItem = getFeeItem(
      order.swapPathStats?.totalSwapPriceImpactDeltaUsd,
      convertTokenAmountToUsd(
        order.initialCollateralDeltaAmount,
        order.initialCollateralToken.decimals,
        order.initialCollateralToken.prices.maxPrice
      )
    );

    if (getIsHighPriceImpact(undefined, swapImpactFeeItem)) {
      errors.push({
        msg: t`There is currently a high swap price impact for the order swap path.`,
        level: 'warning',
        key: 'highPriceImpact',
      });
    }
  }

  const positionOrder = order as PositionOrderInfo;

  const position = Object.values(positionsInfoData || {}).find((pos) =>
    isOrderForPosition(positionOrder, pos)
  );

  if (
    [OrderType.LimitDecrease, OrderType.LimitIncrease].includes(
      positionOrder.orderType
    ) &&
    positionOrder.triggerPrice &&
    positionOrder.acceptablePrice
  ) {
    const { acceptablePriceDeltaBps: currentAcceptablePriceDeltaBps } =
      getAcceptablePriceInfo({
        marketInfo: positionOrder.marketInfo,
        isIncrease: isIncreaseOrderType(positionOrder.orderType),
        isLong: positionOrder.isLong,
        indexPrice: positionOrder.triggerPrice,
        sizeDeltaUsd: positionOrder.sizeDeltaUsd,
      });

    const { acceptablePriceDeltaBps: orderAcceptablePriceDeltaBps } =
      getPriceImpactByAcceptablePrice({
        sizeDeltaUsd: positionOrder.sizeDeltaUsd,
        isIncrease: isIncreaseOrderType(positionOrder.orderType),
        isLong: positionOrder.isLong,
        indexPrice: positionOrder.triggerPrice,
        acceptablePrice: positionOrder.acceptablePrice,
      });

    if (
      currentAcceptablePriceDeltaBps < 0 &&
      currentAcceptablePriceDeltaBps < orderAcceptablePriceDeltaBps
    ) {
      const priceText =
        positionOrder.orderType === OrderType.LimitIncrease
          ? t`limit price`
          : t`trigger price`;
      const formattedCurrentAcceptablePriceImpact = formatPercentage(
        currentAcceptablePriceDeltaBps,
        2,
        { signed: true }
      );
      const formattedOrderAcceptablePriceImpact = formatPercentage(
        orderAcceptablePriceDeltaBps,
        2,
        {
          signed: true,
        }
      );

      errors.push({
        msg: t`The order may not execute at the desired ${priceText} as its acceptable price impact is set to ${formattedOrderAcceptablePriceImpact}, which is lower than the current market price impact of ${formattedCurrentAcceptablePriceImpact}. It can be edited using the "Edit" button.`,
        level: 'warning',
        key: 'acceptablePrice',
      });
    }
  }

  if (positionOrder.orderType === OrderType.LimitIncrease) {
    const currentLiquidity = getMarketAvailableLiquidityUsdForPosition(
      positionOrder.marketInfo,
      positionOrder.isLong
    );

    if (currentLiquidity.lt(positionOrder.sizeDeltaUsd)) {
      errors.push({
        msg: t`There may not be sufficient liquidity to execute your order when the price conditions are met.`,
        level: 'error',
        key: 'liquidity1',
      });
    }

    if (positionOrder.swapPathStats?.swapPath.length) {
      const swapPathLiquidity = getSwapPathOfMaxLiquidity({
        marketsInfo: marketsInfoData,
        swapPath: positionOrder.primarySwapPath ?? EMPTY_ARRAY,
        initialCollateralAddress:
          positionOrder.initialCollateralTokenAddress.toBase58(),
      });

      const collateralSwapUsd = convertTokenAmountToUsd(
        order.initialCollateralDeltaAmount,
        order.initialCollateralToken.decimals,
        order.initialCollateralToken.prices.maxPrice
      );

      if (swapPathLiquidity.lt(collateralSwapUsd)) {
        errors.push({
          msg: t`There may not be sufficient liquidity to execute the pay token to collateral token swap when the price conditions are met.`,
          level: 'error',
          key: 'liquidity2',
        });
      }
    }
  }

  if (!position && !isSwapOrderType(order.orderType)) {
    const collateralSymbol = order.targetCollateralToken.symbol;
    const sameMarketPosition = Object.values(positionsInfoData || {}).find(
      (pos) =>
        pos.marketTokenAddress.equals(order.marketTokenAddress) &&
        pos.isLong === order.isLong
    );

    const symbol = sameMarketPosition?.collateralToken.symbol;
    const longText = sameMarketPosition?.isLong ? t`long` : t`short`;

    if (sameMarketPosition) {
      errors.push({
        msg: t`This order using ${collateralSymbol} as collateral will not be valid for the existing ${longText} position using ${symbol} as collateral.`,
        level: 'warning',
        key: 'collateralToken',
      });
    }
  }

  if (isDecreaseOrderType(order.orderType) && position) {
    const triggerPrice = (order as PositionOrderInfo).triggerPrice;

    if (!triggerPrice) {
      return { errors: [], level: undefined };
    }

    const isInvalidTriggerPrice = position.isLong
      ? position.liquidationPrice === undefined
        ? undefined
        : position.liquidationPrice.gt(triggerPrice)
      : position.liquidationPrice === undefined
        ? undefined
        : position.liquidationPrice.lt(triggerPrice);

    if (isInvalidTriggerPrice) {
      errors.push({
        msg: t`The order will not be executed as its trigger price is beyond the position's liquidation price.`,
        level: 'error',
        key: 'triggerPrice',
      });
    }

    if (order.primarySwapPath?.length) {
      const swapPathLiquidity = getSwapPathOfMaxLiquidity({
        marketsInfo: marketsInfoData,
        swapPath: positionOrder.primarySwapPath ?? EMPTY_ARRAY,
        initialCollateralAddress:
          positionOrder.initialCollateralTokenAddress.toBase58(),
      });

      const minOutputUsd = convertTokenAmountToUsd(
        order.minOutputAmount,
        order.targetCollateralToken.decimals,
        order.targetCollateralToken.prices.maxPrice
      );

      if (swapPathLiquidity.lt(minOutputUsd)) {
        errors.push({
          msg: t`There may not be sufficient liquidity to execute the swap to the receive token when the price conditions are met.`,
          level: 'error',
          key: 'swapPath',
        });
      }
    }
  }

  if (isIncreaseOrderType(order.orderType)) {
    const isMaxLeverageError = getIsMaxLeverageError(
      positionOrder,
      position,
      p.findSwapPath,
      p.wrappedNativeToken
    );

    if (isMaxLeverageError) {
      errors.push({
        msg: t`The order may not execute as the max allowed leverage is exceeded. Consider decreasing the order's leverage by editing and decreasing its size.`,
        key: 'maxLeverage',
        level: 'error',
      });
    }
  }

  const errorsLevelPriority = {
    error: 1,
    warning: 2,
  };

  if (errors.some((err) => err.level === 'error')) {
    level = 'error';
  } else if (errors.some((err) => err.level === 'warning')) {
    level = 'warning';
  }

  return {
    errors: errors.sort((a, b) => {
      return errorsLevelPriority[a.level] - errorsLevelPriority[b.level];
    }),
    level,
  };
}
