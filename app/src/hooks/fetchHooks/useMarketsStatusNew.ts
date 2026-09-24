import { GMX_SOLANA_TOKENS_RAW } from '@/config/program';
import { Market, MarketStatus } from '@/selectors/market/types';
import { selectSetAllMarketStatuses } from '@/selectors/market/baseSelectors';
import { TokenPrices } from '@/selectors/token/types';
import { getMarketPrices } from '@/utils/market/getMarketPrices';
import { getMarinMarketStatus } from '@/utils/market/marinMarketModel';
import { MarketMetaForRequest } from '@/zustand/types';
import { getMarketMetaForRequest } from '@/zustand/utils';
import { useAppStore } from '@/zustand/useAppStore';
import { useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

const EMPTY_ARRAY: MarketMetaForRequest[] = [];

function getTokenDecimals(tokenAddress: string): number | undefined {
  const token = GMX_SOLANA_TOKENS_RAW[tokenAddress];
  return token?.decimals_gmx ?? token?.decimals;
}

export const useMarketsStatus = (
  markets: Market[],
  prices: Record<string, TokenPrices>,
  isPricesInitialized: boolean,
  areMarketsInitialized: boolean = true
) => {
  const setAllMarketStatuses = useAppStore(selectSetAllMarketStatuses);
  const { marketBase64Map, marketInfos, marketsState } = useAppStore(
    useShallow((state) => ({
      marketBase64Map: state.markets.marketBase64Map,
      marketInfos: state.markets.marketInfos,
      marketsState: state.markets.marketsState,
    }))
  );
  const reqs = useMemo(
    () =>
      isPricesInitialized && areMarketsInitialized
        ? markets.map((market) => getMarketMetaForRequest(market))
        : EMPTY_ARRAY,
    [areMarketsInitialized, isPricesInitialized, markets]
  );

  const derived = useMemo(() => {
    const marketsStatus: Record<string, MarketStatus> = {};
    const missingMarketTokens: string[] = [];
    const marketInfoByToken = new Map(
      marketInfos.map((marketInfo) => [marketInfo.marketToken, marketInfo])
    );

    for (const req of reqs) {
      const key = req.key.toBase58();
      const marketBase64 = marketBase64Map.get(key);
      const marketInfo = marketInfoByToken.get(key);
      const marketPrices = getMarketPrices(prices, req);
      const fundingFactorPerSecond =
        marketsState[key]?.fundingFactorPerSecond;
      const indexTokenDecimals = getTokenDecimals(req.indexToken.toBase58());
      const longTokenDecimals = getTokenDecimals(req.longToken.toBase58());
      const shortTokenDecimals = getTokenDecimals(req.shortToken.toBase58());

      if (
        !marketBase64 ||
        marketInfo?.supply == null ||
        marketInfo.supply === '' ||
        !marketPrices ||
        fundingFactorPerSecond == null ||
        indexTokenDecimals == null ||
        longTokenDecimals == null ||
        shortTokenDecimals == null
      ) {
        missingMarketTokens.push(key);
        continue;
      }

      const status = getMarinMarketStatus({
        marketBase64,
        marketPrices: {
          indexTokenPrice: {
            ...marketPrices.indexTokenPrice,
            decimals: indexTokenDecimals,
          },
          longTokenPrice: {
            ...marketPrices.longTokenPrice,
            decimals: longTokenDecimals,
          },
          shortTokenPrice: {
            ...marketPrices.shortTokenPrice,
            decimals: shortTokenDecimals,
          },
        },
        supply: marketInfo.supply,
        fundingFactorPerSecond,
      });

      if (status) {
        marketsStatus[key] = status;
      } else {
        missingMarketTokens.push(key);
      }
    }

    return { marketsStatus, missingMarketTokens };
  }, [marketBase64Map, marketInfos, marketsState, prices, reqs]);

  useEffect(() => {
    setAllMarketStatuses(derived.marketsStatus);
  }, [derived.marketsStatus, setAllMarketStatuses]);

  const isLoading = !isPricesInitialized || !areMarketsInitialized;
  const isPartial =
    !isLoading && derived.missingMarketTokens.length > 0;

  return {
    marketsStatus: derived.marketsStatus,
    isLoading,
    isPartial,
    missingMarketTokens: derived.missingMarketTokens,
  };
};
