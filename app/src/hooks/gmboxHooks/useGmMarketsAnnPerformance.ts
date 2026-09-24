import { BN_ZERO } from '@/config/constants';
import { GRAPHQL_ENDPOINT } from '@/config/url';
import { MarketTokensAPR } from '@/selectors/market/types';
import { selectGlvTokensData } from '@/selectors/token/selectGlvTokensData';
import { selectMarketTokensData } from '@/selectors/token/selectMarketTokensData';
import { useAppStore } from '@/zustand/useAppStore';
import { BN } from '@coral-xyz/anchor';
import { useEffect, useMemo } from 'react';
import useSWR from 'swr';

type GmGlvTokensAPRResult = {
  marketGmAnnPerformanceHourlies: MarketTokensAPR;
  glvAnnPerformanceHourlies: MarketTokensAPR;
};

interface CombinedApyResponse {
  data: {
    marketGmAnnPerformanceHourlies: Array<{
      id: string;
      annPerformance30dV2: string;
      marketToken: string;
    }>;
    glvAnnPerformanceHourlies: Array<{
      id: string;
      annPerformance30dV2: string;
      glvToken: string;
    }>;
  };
}

const APY_DATA_KEY = 'data_store/ann_data';

export function useGmMarketsAnnPerformance(): GmGlvTokensAPRResult {
  const marketTokensData = useAppStore(selectMarketTokensData);
  const glvTokensData = useAppStore(selectGlvTokensData);

  // Fetch both GM Markets and GLV APY data in a single GraphQL query
  const { data: apyData, isLoading } = useSWR<CombinedApyResponse>(
    [
      APY_DATA_KEY,
      Object.keys(glvTokensData || {}).length,
      Object.keys(marketTokensData || {}).length,
    ],
    async () => {
      try {
        const glvTokens = Object.keys(glvTokensData || {});
        const marketTokens = Object.keys(marketTokensData || {});
        const response = await fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              query MyQuery {
                glvAnnPerformanceHourlies(
                  orderBy: timestamp_DESC,
                  limit: 500,
                  where: {glvToken_in: ${JSON.stringify(glvTokens)} }
                ) {
                  annPerformance30dV2
                  id
                  glvToken
                  timestamp
                }
                marketGmAnnPerformanceHourlies(
                  orderBy: timestamp_DESC,
                  limit: 500,
                  where: {marketToken_in: ${JSON.stringify(marketTokens)} }
                ) {
                  annPerformance30dV2
                  id
                  marketToken
                  timestamp
                }
              }
            `,
          }),
        });

        const result = (await response.json()) as CombinedApyResponse;
        return result;
      } catch (error) {
        console.error('Error fetching APY data:', error);
        return { data: { marketGmInfos: [], glvInfos: [] } };
      }
    },
    {
      refreshInterval: 60000, // Refresh every minute
    }
  );

  // Process market tokens APY data
  const marketGmAnnPerformanceHourlies = useMemo(() => {
    const result: MarketTokensAPR = {};

    if (isLoading || !apyData?.data?.marketGmAnnPerformanceHourlies) {
      Object.keys(marketTokensData).forEach((marketAddress) => {
        result[marketAddress] = BN_ZERO;
      });
      return result;
    }

    // Initialize all markets with zero APY
    Object.keys(marketTokensData).forEach((marketAddress) => {
      const marketInfo = apyData.data.marketGmAnnPerformanceHourlies.find(
        (item) => item.marketToken === marketAddress
      );
      if (!marketInfo) {
        result[marketAddress] = BN_ZERO;
      } else {
        result[marketAddress] = BN_ZERO;
        const apyValue = parseFloat(marketInfo.annPerformance30dV2);
        const apyBN = new BN(Math.floor(apyValue * 10000));
        result[marketInfo.marketToken] = apyBN;
      }
    });

    return result;
  }, [marketTokensData, apyData, isLoading]);

  // Process GLV tokens APY data directly from API
  const glvAnnPerformanceHourlies = useMemo(() => {
    const result: MarketTokensAPR = {};

    if (isLoading || !apyData?.data?.glvAnnPerformanceHourlies) {
      Object.keys(glvTokensData).forEach((glvAddress) => {
        result[glvAddress] = BN_ZERO;
      });
      return result;
    }

    // Initialize all GLVs with zero APY
    Object.keys(glvTokensData).forEach((glvAddress) => {
      const glvInfo = apyData.data.glvAnnPerformanceHourlies.find(
        (item) => item.glvToken === glvAddress
      );
      if (!glvInfo) {
        result[glvAddress] = BN_ZERO;
      } else {
        result[glvAddress] = BN_ZERO;
        const apyValue = parseFloat(glvInfo.annPerformance30dV2);
        const apyBN = new BN(Math.floor(apyValue * 10000));
        result[glvInfo.glvToken] = apyBN;
      }
    });

    // Update GLVs with APY data from SQD
    // apyData.data.glvAnnPerformanceHourlies.forEach((glvInfo) => {
    //   if (glvInfo.glvToken in result) {
    //     // Convert APY to BN with 4 decimal places (multiply by 10000)
    //     const apyValue = parseFloat(glvInfo.annPerformance30d);
    //     const apyBN = new BN(Math.floor(apyValue * 10000));
    //     result[glvInfo.glvToken] = apyBN;
    //   }
    // });

    return result;
  }, [glvTokensData, apyData, isLoading]);

  // useEffect(() => {
  //   console.log('marketGmAnnPerformanceHourlies', {marketGmAnnPerformanceHourlies});
  // }, [glvAnnPerformanceHourlies, glvTokensData, marketGmAnnPerformanceHourlies, marketTokensData])

  return {
    glvAnnPerformanceHourlies,
    marketGmAnnPerformanceHourlies,
  };
}
