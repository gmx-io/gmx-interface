import { MarketsInfo } from '@/selectors/market/types';
import { getMarketIndexName } from '@/utils/market/getMarketIndexName';
import { getMarketPoolName } from '@/utils/market/getMarketPoolName';

export function getSwapPathMarketFullNames(
  marketsInfo: MarketsInfo | undefined,
  swapPath: string[]
): { indexName: string; poolName: string }[] | undefined {
  if (!marketsInfo) {
    return undefined;
  }

  return swapPath.map((marketAddress) => {
    const marketInfo = marketsInfo[marketAddress];

    if (!marketInfo) {
      return {
        indexName: '...',
        poolName: '...',
      };
    }

    const indexName = getMarketIndexName({
      indexToken: marketInfo.indexToken,
      isSpotOnly: marketInfo.isSpotOnly,
    });
    const poolName = getMarketPoolName({
      longToken: marketInfo.longToken,
      shortToken: marketInfo.shortToken,
    });

    return {
      indexName,
      poolName,
    };
  });
}
