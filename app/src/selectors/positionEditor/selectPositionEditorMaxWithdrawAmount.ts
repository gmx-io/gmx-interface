import { BN_ZERO } from '@/config/constants';
import { convertUsdToTokenAmount } from '@/utils/legacy/convert';
import { getMinCollateralUsdForLeverage } from '@/utils/position/getMinCollateralUsdForLeverage';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { BN } from '@coral-xyz/anchor';

import { selectPositionConstants } from '../position/baseSelectors';
import { selectPositionEditorCollateralToken } from './selectPositionEditorCollateralToken';
import { selectPositionEditorEditingPosition } from './selectPositionEditorEditingPosition';

export const selectPositionEditorMaxWithdrawAmount = createAppStoreSelector(
  [
    selectPositionEditorEditingPosition,
    selectPositionEditorCollateralToken,
    selectPositionConstants,
  ],
  (position, collateralToken, { minCollateralUsd }) => {
    if (!position) return BN_ZERO;

    const minCollateralUsdForLeverage =
      getMinCollateralUsdForLeverage(position);
    let _minCollateralUsd = minCollateralUsdForLeverage;

    if (
      minCollateralUsd !== undefined &&
      minCollateralUsd.gt(_minCollateralUsd)
    ) {
      _minCollateralUsd = minCollateralUsd;
    }

    _minCollateralUsd = _minCollateralUsd
      .add(position?.pendingBorrowingFeesUsd ?? BN_ZERO)
      .add(position?.pendingFundingFeesUsd ?? BN_ZERO);

    if (position.netValue && position.netValue.lt(_minCollateralUsd)) {
      return BN_ZERO;
    }

    const maxWithdrawUsd = BN.min(
      position.netValue?.sub(_minCollateralUsd) ?? BN_ZERO,
      position.collateralUsd?.sub(_minCollateralUsd) ?? BN_ZERO
    );
    const collateralPrice = collateralToken?.prices.maxPrice;

    const maxWithdrawAmount =
      convertUsdToTokenAmount(
        maxWithdrawUsd,
        collateralToken?.decimals,
        collateralPrice
      ) ?? BN_ZERO;

    return maxWithdrawAmount;
  }
);
