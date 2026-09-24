import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectMarketsInfo } from '../market/selectMarketsInfo';
import { selectTradeboxMarketInfo } from './selectTradeboxMarketInfo';
import { isSameTokenAddress } from '@/utils/token/isSameTokenAddress';

export const selectTradeboxAvailableAndDisabledTokensForCollateral =
  createAppStoreSelector(
    selectMarketsInfo,
    selectTradeboxMarketInfo,
    (marketsInfo, currentMarket) => {
      if (!marketsInfo || !currentMarket) {
        return {
          availableTokens: [],
          disabledTokens: [],
        };
      }

      const availableTokens = currentMarket.isSingle
        ? [currentMarket.longToken]
        : [currentMarket.longToken, currentMarket.shortToken];

      const disabledTokens = Object.values(marketsInfo)
        .filter((market) =>
          isSameTokenAddress(
            market.indexTokenAddress,
            currentMarket.indexTokenAddress
          )
        )
        .flatMap((market) => [market.longToken, market.shortToken])
        .filter(
          (token, index, self) =>
            index ===
            self.findIndex((t) => isSameTokenAddress(t.address, token.address))
        )
        .filter(
          (token) =>
            token.address.toBase58() !==
              currentMarket.longToken.address.toBase58() &&
            token.address.toBase58() !==
              currentMarket.shortToken.address.toBase58()
        )
        .sort((a, b) => {
          if (a.isStable && !b.isStable) return -1;
          if (!a.isStable && b.isStable) return 1;
          return 0;
        });

      return {
        availableTokens,
        disabledTokens,
      };
    }
  );
