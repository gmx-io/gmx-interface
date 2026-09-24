import { createAppStoreSelector } from '@/zustand/useAppStore';
import { getGmw402Enabled } from '@/config/featureFlagEnable';
import { selectTradeboxToToken } from './selectTradeboxToToken';
import { getPriceDecimals } from '@/utils/legacy/common';
import { getMarketPriceInputDecimalsFromPrices } from '@/utils/priceInput/getMarketPriceInputDecimals';

export const selectTradeboxMarkPriceDecimals = createAppStoreSelector(
  selectTradeboxToToken,
  (toToken) => {
    if (getGmw402Enabled()) {
      return getMarketPriceInputDecimalsFromPrices(
        toToken?.prices,
        toToken?.address.toBase58()
      );
    }

    return getPriceDecimals(toToken?.prices.minPrice);
  }
);
