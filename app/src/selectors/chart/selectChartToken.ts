import { selectTokensData } from '@/selectors/token/selectTokensData';
import { selectTradeboxFromToken } from '@/selectors/tradebox/selectTradeboxFromToken';
import { selectTradeboxToToken } from '@/selectors/tradebox/selectTradeboxToToken';
import { selectTradeboxTradeFlags } from '@/selectors/tradebox/selectTradeboxTradeFlags';
import { getByKey } from '@/utils/lib/object';
import { getUnwrappedTokenAddress } from '@/utils/token/getUnwrappedTokenAddress';
import { createAppStoreSelector } from '@/zustand/useAppStore';

export const selectChartToken = createAppStoreSelector(
  [
    selectTradeboxFromToken,
    selectTradeboxToToken,
    selectTradeboxTradeFlags,
    selectTokensData,
  ],
  (fromToken, toToken, { isSwap }, tokensData) => {
    if (!fromToken || !toToken || !tokensData) {
      return undefined;
    }

    // Select initial chart token based on swap conditions
    const initialChartToken =
      isSwap && toToken.isStable && !fromToken.isStable ? fromToken : toToken;

    // Get unwrapped token address and then get the token data
    const unwrappedAddress =
      initialChartToken.isWrapped && initialChartToken.unwrappedAddress
        ? initialChartToken.unwrappedAddress.toBase58()
        : getUnwrappedTokenAddress(initialChartToken.address.toBase58());

    return getByKey(tokensData, unwrappedAddress) || initialChartToken;
  }
);
