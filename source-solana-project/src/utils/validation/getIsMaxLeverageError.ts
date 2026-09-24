import { BN_ZERO } from '@/config/constants';
import { TokenData } from '@/selectors/token/types';
import { PositionOrderInfo } from '@/selectors/order/types';
import { PositionInfo } from '@/selectors/position/types';
import { FindSwapPath } from '@/selectors/trade/types';
import {
  convertTokenAmountToUsd,
  convertUsdToTokenAmount,
} from '@/utils/legacy/convert';
import { getPositionLeverage } from '@/utils/position/getPositionLeverage';
import { getSwapAmountsByFromValue } from '@/utils/tradebox/getSwapAmountsByFromValue';
import { getIsMaxLeverageExceeded } from '@/utils/validation/getIsMaxLeverageExceeded';

export function getIsMaxLeverageError(
  order: PositionOrderInfo,
  position: PositionInfo | undefined,
  findSwapPath: FindSwapPath,
  wrappedNativeToken: TokenData
) {
  if (!wrappedNativeToken) {
    return false;
  }

  const swapAmounts = getSwapAmountsByFromValue({
    tokenInRaw: order.initialCollateralToken,
    tokenOutRaw: order.targetCollateralToken,
    amountIn: order.initialCollateralDeltaAmount,
    isLimit: false,
    findSwapPath,
    wrappedNativeToken,
  });
  const markPrice = order.marketInfo.indexToken.prices.minPrice;
  const sizeDeltaUsd = order.sizeDeltaUsd;
  const sizeDeltaInTokens =
    convertUsdToTokenAmount(
      sizeDeltaUsd,
      order.marketInfo.indexToken.decimals,
      markPrice
    ) ?? BN_ZERO;

  if (sizeDeltaInTokens === undefined) return false;

  const isLong = order.isLong;
  const marketInfo = order.marketInfo;

  const collateralDeltaAmount = swapAmounts.amountOut;
  const collateralDeltaUsd = convertTokenAmountToUsd(
    collateralDeltaAmount,
    order.targetCollateralToken.decimals,
    order.targetCollateralToken.prices.minPrice
  );

  if (collateralDeltaUsd === undefined) return false;

  const leverage = getPositionLeverage({
    sizeInUsd: order.sizeDeltaUsd.add(position?.sizeInUsd ?? BN_ZERO),
    collateralUsd: collateralDeltaUsd.add(position?.collateralUsd ?? BN_ZERO),
    pnl: undefined,
    pendingBorrowingFeesUsd: BN_ZERO,
    pendingFundingFeesUsd: BN_ZERO,
  });

  if (leverage === undefined) return false;

  return getIsMaxLeverageExceeded(leverage, marketInfo, isLong, sizeDeltaUsd);
}
