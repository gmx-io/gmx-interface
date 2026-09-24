import { TokenData } from '@/selectors/token/types';
import { getIsEquivalentTokens } from '@/utils/token/getIsEquivalentTokens';
import { DecreasePositionSwapType } from '@/utils/tradebox/types';

export function getDecreaseSwapType(
  pnlToken: TokenData,
  collateralToken: TokenData,
  receiveToken: TokenData
) {
  if (getIsEquivalentTokens(pnlToken, collateralToken)) {
    return DecreasePositionSwapType.NoSwap;
  } else if (getIsEquivalentTokens(pnlToken, receiveToken)) {
    return DecreasePositionSwapType.SwapCollateralTokenToPnlToken;
  } else {
    return DecreasePositionSwapType.SwapPnlTokenToCollateralToken;
  }
}
