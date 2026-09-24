import { NATIVE_TOKEN_ADDRESS } from '@/config/tokens';
import { getByKey } from '@/utils/lib/object';
import { selectPositionSellerClosingPosition } from './selectPositionSellerClosingPosition';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectTokensData } from '../token/selectTokensData';
import { isWrappedNativeToken } from '@/utils/token/isWrappedNativeToken';
import { selectMarketsInfo } from '../market/selectMarketsInfo';

export const selectPositionSellerAvailableReceiveTokens =
  createAppStoreSelector(
    [selectPositionSellerClosingPosition, selectMarketsInfo, selectTokensData],
    (position, marketsInfo, tokensData) => {
      if (!position?.marketTokenAddress || !tokensData || !marketsInfo) {
        return [];
      }

      const tokens = [];

      // Only return position's collateral token
      if (position.collateralToken) {
        if (isWrappedNativeToken(position.collateralToken.address)) {
          const nativeToken = getByKey(
            tokensData,
            NATIVE_TOKEN_ADDRESS.toBase58()
          );
          if (nativeToken) {
            tokens.push(nativeToken);
          }
        } else {
          tokens.push(position.collateralToken);
        }
      }

      return tokens;
    }
  );
