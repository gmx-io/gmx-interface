import { BN_ZERO } from '@/config/constants';
import {
  OrderInfo,
  OrderType,
  PositionOrderInfo,
} from '@/selectors/order/types';
import { selectOrderEditorAcceptablePrice } from '@/selectors/orderEditor/selectOrderEditorAcceptablePrice';
import { selectOrderEditorExistingPosition } from '@/selectors/orderEditor/selectOrderEditorExistingPosition';
import { selectOrderEditorIsRatioInverted } from '@/selectors/orderEditor/selectOrderEditorIsRatioInverted';
import { selectOrderEditorMarkPrice } from '@/selectors/orderEditor/selectOrderEditorMarkPrice';
import { selectOrderEditorMarkRatio } from '@/selectors/orderEditor/selectOrderEditorMarkRatio';
import { selectOrderEditorMaxAllowedLeverage } from '@/selectors/orderEditor/selectOrderEditorMaxAllowedLeverage';
import { selectOrderEditorMinOutputAmount } from '@/selectors/orderEditor/selectOrderEditorMinOutputAmount';
import { selectOrderEditorNextPositionValuesForIncrease } from '@/selectors/orderEditor/selectOrderEditorNextPositionValuesForIncrease';
import { selectOrderEditorNextPositionValuesForIncreaseWithoutPnl } from '@/selectors/orderEditor/selectOrderEditorNextPositionValuesForIncreaseWithoutPnl';
import { selectOrderEditorSizeDeltaUsd } from '@/selectors/orderEditor/selectOrderEditorSizeDeltaUsd';
import { selectOrderEditorTriggerPrice } from '@/selectors/orderEditor/selectOrderEditorTriggerPrice';
import { selectOrderEditorTriggerRatio } from '@/selectors/orderEditor/selectOrderEditorTriggerRatio';
import {
  isLimitOrderType,
  isSwapOrderType,
  isTriggerDecreaseOrderType,
} from '@/utils/order/isOrderType';
import { getIsMaxLeverageExceeded } from '@/utils/validation/getIsMaxLeverageExceeded';
import { useAppStore } from '@/zustand/useAppStore';
import { t } from '@lingui/macro';
import { useMemo } from 'react';

interface OrderEditorErrorResult {
  error: string | undefined;
  isMaxLeverageError: boolean;
}

export function useOrderEditorError(
  order: OrderInfo,
  isUpdatingOrder: boolean
): OrderEditorErrorResult {
  const sizeDeltaUsd = useAppStore(selectOrderEditorSizeDeltaUsd);
  const triggerPrice = useAppStore(selectOrderEditorTriggerPrice);
  const markRatio = useAppStore(selectOrderEditorMarkRatio);
  const triggerRatio = useAppStore(selectOrderEditorTriggerRatio);
  const minOutputAmount = useAppStore(selectOrderEditorMinOutputAmount);
  const existingPosition = useAppStore(selectOrderEditorExistingPosition);
  const nextPositionValuesForIncrease = useAppStore(
    selectOrderEditorNextPositionValuesForIncrease
  );
  const nextPositionValuesWithoutPnlForIncrease = useAppStore(
    selectOrderEditorNextPositionValuesForIncreaseWithoutPnl
  );
  const maxAllowedLeverage = useAppStore(selectOrderEditorMaxAllowedLeverage);
  const acceptablePrice = useAppStore(selectOrderEditorAcceptablePrice);
  const isRatioInverted = useAppStore(selectOrderEditorIsRatioInverted);
  const markPrice = useAppStore(selectOrderEditorMarkPrice);

  return useMemo(() => {
    let isMaxLeverageError = false;

    if (isUpdatingOrder) {
      return {
        error: t`Updating Order...`,
        isMaxLeverageError: false,
      };
    }

    if (isSwapOrderType(order.orderType)) {
      if (
        triggerRatio?.ratio === undefined ||
        triggerRatio?.ratio.lt(BN_ZERO) ||
        minOutputAmount.lte(BN_ZERO)
      ) {
        return {
          error: t`Enter a ratio`,
          isMaxLeverageError: false,
        };
      }

      if (minOutputAmount.eq(order.minOutputAmount)) {
        return {
          error: t`Enter a new ratio`,
          isMaxLeverageError: false,
        };
      }

      if (
        triggerRatio &&
        !isRatioInverted &&
        markRatio &&
        markRatio.ratio.lt(triggerRatio.ratio)
      ) {
        return {
          error: t`Price above Mark Price`,
          isMaxLeverageError: false,
        };
      }

      if (
        triggerRatio &&
        isRatioInverted &&
        markRatio &&
        markRatio.ratio.gt(triggerRatio.ratio)
      ) {
        return {
          error: t`Price below Mark Price`,
          isMaxLeverageError: false,
        };
      }

      return {
        error: undefined,
        isMaxLeverageError: false,
      };
    }

    if (markPrice === undefined) {
      return {
        error: t`Loading...`,
        isMaxLeverageError: false,
      };
    }

    if (sizeDeltaUsd === undefined || sizeDeltaUsd.lt(BN_ZERO)) {
      return {
        error: t`Enter an amount`,
        isMaxLeverageError: false,
      };
    }

    if (triggerPrice === undefined || triggerPrice.lt(BN_ZERO)) {
      return {
        error: t`Enter a price`,
        isMaxLeverageError: false,
      };
    }

    if (
      sizeDeltaUsd.eq(order.sizeDeltaUsd) &&
      triggerPrice.eq(order.triggerPrice) &&
      acceptablePrice?.eq(order.acceptablePrice ?? BN_ZERO)
    ) {
      return {
        error: t`Enter new amount or price`,
        isMaxLeverageError: false,
      };
    }

    if (isLimitOrderType(order.orderType)) {
      if (order.isLong) {
        if (triggerPrice.gte(markPrice)) {
          return {
            error: t`Price above Mark Price`,
            isMaxLeverageError: false,
          };
        }
      } else {
        if (triggerPrice.lte(markPrice)) {
          return {
            error: t`Price below Mark Price`,
            isMaxLeverageError: false,
          };
        }
      }
    }

    if (isTriggerDecreaseOrderType(order.orderType)) {
      if (markPrice === undefined) {
        return {
          error: t`Loading...`,
          isMaxLeverageError: false,
        };
      }

      if (
        sizeDeltaUsd.eq(order.sizeDeltaUsd) &&
        triggerPrice.eq(order.triggerPrice) &&
        acceptablePrice?.eq(order.acceptablePrice ?? BN_ZERO)
      ) {
        return {
          error: t`Enter a new size or price`,
          isMaxLeverageError: false,
        };
      }

      if (existingPosition?.liquidationPrice) {
        if (
          existingPosition.isLong &&
          triggerPrice.lte(existingPosition?.liquidationPrice)
        ) {
          return {
            error: t`Price below Liquidation Price`,
            isMaxLeverageError: false,
          };
        }

        if (
          !existingPosition.isLong &&
          triggerPrice.gte(existingPosition?.liquidationPrice)
        ) {
          return {
            error: t`Price above Liquidation Price`,
            isMaxLeverageError: false,
          };
        }
      }

      if (order.isLong) {
        if (
          order.orderType === OrderType.LimitDecrease &&
          triggerPrice.lte(markPrice)
        ) {
          return {
            error: t`Price below Mark Price`,
            isMaxLeverageError: false,
          };
        }

        if (
          order.orderType === OrderType.StopLossDecrease &&
          triggerPrice.gte(markPrice)
        ) {
          return {
            error: t`Price above Mark Price`,
            isMaxLeverageError: false,
          };
        }
      } else {
        if (
          order.orderType === OrderType.LimitDecrease &&
          triggerPrice.gte(markPrice)
        ) {
          return {
            error: t`Price above Mark Price`,
            isMaxLeverageError: false,
          };
        }

        if (
          order.orderType === OrderType.StopLossDecrease &&
          triggerPrice.lte(markPrice)
        ) {
          return {
            error: t`Price below Mark Price`,
            isMaxLeverageError: false,
          };
        }
      }
    }

    const isLimitIncreaseOrder = order.orderType === OrderType.LimitIncrease;

    const positionOrder = order as PositionOrderInfo;
    if (isLimitIncreaseOrder) {
      if (
        nextPositionValuesForIncrease?.nextLeverage !== undefined &&
        nextPositionValuesForIncrease?.nextLeverage.gt(maxAllowedLeverage)
      ) {
        isMaxLeverageError = true;
        return {
          error: t`Max leverage exceeded`,
          isMaxLeverageError,
        };
      }

      if (nextPositionValuesWithoutPnlForIncrease?.nextLeverage !== undefined) {
        const leverageExceeded = getIsMaxLeverageExceeded(
          nextPositionValuesWithoutPnlForIncrease?.nextLeverage,
          positionOrder.marketInfo,
          positionOrder.isLong,
          sizeDeltaUsd
        );

        if (leverageExceeded) {
          isMaxLeverageError = true;
          return {
            error: t`Max leverage exceeded`,
            isMaxLeverageError,
          };
        }
      }
    }

    return {
      error: undefined,
      isMaxLeverageError: false,
    };
  }, [
    isRatioInverted,
    isUpdatingOrder,
    order,
    sizeDeltaUsd,
    triggerPrice,
    markRatio,
    triggerRatio,
    minOutputAmount,
    existingPosition,
    nextPositionValuesForIncrease,
    nextPositionValuesWithoutPnlForIncrease,
    maxAllowedLeverage,
    acceptablePrice,
    markPrice,
  ]);
}
