import { createAppStoreSelector } from '@/zustand/useAppStore';
// import { selectTradeboxFromTokenAddress } from '../tradebox/selectTradeboxFromTokenAddress';
// import { selectTradeboxToTokenAddress } from '../tradebox/selectTradeboxToTokenAddress';
import { selectTradeboxTradeFlags } from '../tradebox/selectTradeboxTradeFlags';
import { selectAvailableTokenOptions } from '../token/selectAvailableTokenOptions';

export const selectAvailableChartTokens = createAppStoreSelector(
  [selectAvailableTokenOptions, selectTradeboxTradeFlags],
  (
    {
      swapTokens,
      indexTokens,
      sortedIndexTokensWithPoolValue,
      sortedLongAndShortTokens,
    },
    { isSwap }
  ) => {
    // console.log('🚀 ~ isSwap:', {
    //   swapTokens,
    //   indexTokens,
    //   sortedIndexTokensWithPoolValue,
    //   sortedLongAndShortTokens,
    // });
    const availableChartTokens = isSwap ? swapTokens : indexTokens;
    const currentSortReferenceList = isSwap
      ? sortedLongAndShortTokens
      : sortedIndexTokensWithPoolValue;
    const sortedAvailableChartTokens = availableChartTokens.sort((a, b) => {
      if (currentSortReferenceList) {
        return (
          currentSortReferenceList.indexOf(a.address.toBase58()) -
          currentSortReferenceList.indexOf(b.address.toBase58())
        );
      } else {
        return 0;
      }
    });

    return sortedAvailableChartTokens;
  }
);
