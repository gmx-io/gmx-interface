import { SortDirection } from '@/components/Common/Sorter/Sorter';
import { marketSortingComparatorBuilder } from '@/components/Selectors/MarketTokenSelector/marketSortingComparatorBuilder';
import { SortField } from '@/components/Selectors/MarketTokenSelector/MarketTokenSelector';
import { GlvAndGmMarketsInfo } from '@/selectors/glv/types';
import { MarketsInfo, MarketTokensAPR } from '@/selectors/market/types';
import { TokenData, TokensData } from '@/selectors/token/types';
import { getGlvDisplayName } from '@/utils/glv/getGlvDisplayName';
import { getGlvMintableInfo } from '@/utils/glv/getGlvMintableInfo';
import { getGlvSellableInfo } from '@/utils/glv/getGlvSellableInfo';
import { isGlvInfo } from '@/utils/glv/isGlvInfo';
import { getGmMintableMarketToken } from '@/utils/gm/getGmMintableMarketToken';
import { getGmSellableMarketToken } from '@/utils/gm/getGmSellableMarketToken';
import { getByKey } from '@/utils/lib/object';
import { searchBy } from '@/utils/lib/searchBy';
import { getMarketIndexName } from '@/utils/market/getMarketIndexName';
import { getMarketPoolName } from '@/utils/market/getMarketPoolName';
import { useMemo } from 'react';

export function useFilterSortTokensInfo({
  sortedMarketsByIndexToken,
  searchKeyword,
  marketsInfoData,
  glvAndMarketTokensData,
  glvAndMarketsInfoData,
  marketTokensAprData,
  glvTokensApyData,
  orderBy,
  direction,
}: {
  sortedMarketsByIndexToken: TokenData[];
  searchKeyword: string;
  glvAndMarketTokensData: TokensData | undefined;
  marketsInfoData: MarketsInfo | undefined;
  glvAndMarketsInfoData: GlvAndGmMarketsInfo | undefined;
  marketTokensAprData: MarketTokensAPR | undefined;
  glvTokensApyData: MarketTokensAPR | undefined;
  orderBy: SortField;
  direction: SortDirection;
}) {
  const filteredTokensInfo = useMemo(() => {
    if (sortedMarketsByIndexToken.length < 1) {
      return [];
    }

    // Include all tokens - both GLVs and GMs
    const filteredByGlvSupport = sortedMarketsByIndexToken;

    const textMatched = searchKeyword.trim()
      ? searchBy(
          filteredByGlvSupport,
          [
            (item) => {
              const glvOrMarketInfo = getByKey(
                glvAndMarketsInfoData,
                item?.address.toBase58()
              )!;
              return isGlvInfo(glvOrMarketInfo)
                ? getGlvDisplayName(glvOrMarketInfo)
                : glvOrMarketInfo.name;
            },
          ],
          searchKeyword
        )
      : filteredByGlvSupport;

    return textMatched.map((market) => {
      const glvOrMarketInfo = getByKey(
        glvAndMarketsInfoData,
        market?.address.toBase58()
      )!;

      const isGlv = isGlvInfo(glvOrMarketInfo);

      const mintableInfo = isGlv
        ? getGlvMintableInfo(glvOrMarketInfo, glvAndMarketTokensData)
        : getGmMintableMarketToken(glvOrMarketInfo, market);
      const sellableInfo = isGlv
        ? getGlvSellableInfo(
            glvOrMarketInfo,
            marketsInfoData,
            glvAndMarketTokensData
          )
        : getGmSellableMarketToken(glvOrMarketInfo, market);
      const apr = getByKey(
        isGlv ? glvTokensApyData : marketTokensAprData,
        market?.address.toBase58()
      );
      const indexName = isGlv
        ? getGlvDisplayName(glvOrMarketInfo)
        : getMarketIndexName(glvOrMarketInfo);
      const poolName = getMarketPoolName(glvOrMarketInfo);
      return {
        market,
        mintableInfo,
        sellableInfo,
        glvOrMarketInfo,
        indexName,
        poolName,
        apr,
      };
    });
  }, [
    sortedMarketsByIndexToken,
    searchKeyword,
    marketsInfoData,
    glvAndMarketTokensData,
    glvAndMarketsInfoData,
    glvTokensApyData,
    marketTokensAprData,
  ]);

  const sortedTokensInfo = useMemo(() => {
    const comparator = marketSortingComparatorBuilder({
      orderBy,
      direction,
    });

    return [...filteredTokensInfo].sort(comparator);
  }, [orderBy, direction, filteredTokensInfo]);

  return sortedTokensInfo;
}
