import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectPositionSellerClosingPosition } from './selectPositionSellerClosingPosition';
import { selectPositionSellerMarkPrice } from './selectPositionSellerMarkPrice';
import { selectPositionSellerFees } from './selectPositionSellerFees';
import { selectPositionSellerDecreaseAmounts } from './selectPositionSellerDecreaseAmounts';
import { getNextPositionExecutionPrice } from '@/utils/position/getNextPositionExecutionPrice';
import { OrderOption } from '@/selectors/order/types';
import { selectPositionSellerOrderOption } from './baseSelectors';

export const selectPositionSellerExecutionPrice = createAppStoreSelector(
  [
    selectPositionSellerClosingPosition,
    selectPositionSellerMarkPrice,
    selectPositionSellerOrderOption,
    selectPositionSellerFees,
    selectPositionSellerDecreaseAmounts,
  ],
  (position, markPrice, orderOption, fees, decreaseAmounts) => {
    if (!position || fees?.fees?.positionPriceImpact?.deltaUsd === undefined) {
      return null;
    }

    const nextTriggerPrice =
      orderOption === OrderOption.Market
        ? markPrice
        : decreaseAmounts?.triggerPrice;
    const sizeDeltaUsd = decreaseAmounts?.sizeDeltaUsd;

    if (nextTriggerPrice === undefined || sizeDeltaUsd === undefined) {
      return null;
    }

    return getNextPositionExecutionPrice({
      triggerPrice: nextTriggerPrice,
      priceImpactUsd: fees.fees.positionPriceImpact.deltaUsd,
      sizeDeltaUsd,
      isLong: position.isLong,
      isIncrease: false,
    });
  }
);
