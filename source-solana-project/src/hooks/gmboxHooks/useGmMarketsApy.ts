import { BN_ZERO } from '@/config/constants';
import { GRAPHQL_ENDPOINT } from '@/config/url';
import { MarketTokensAPR } from '@/selectors/market/types';
import { selectGlvTokensData } from '@/selectors/token/selectGlvTokensData';
import { selectMarketTokensData } from '@/selectors/token/selectMarketTokensData';
import { useAppStore } from '@/zustand/useAppStore';
import { BN } from '@coral-xyz/anchor';
import { useMemo } from 'react';
import useSWR from 'swr';

type GmGlvTokensAPRResult = {
  marketTokensAprData: MarketTokensAPR;
  glvTokensApyData: MarketTokensAPR;
};

interface CombinedApyResponse {
  data: {
    marketGmInfos: Array<{
      id: string;
      apy: string;
    }>;
    glvInfos: Array<{
      id: string;
      apy: string;
    }>;
  };
}

const APY_DATA_KEY = 'data_store/apy_data';

export function useGmMarketsApy(): GmGlvTokensAPRResult {
  const marketTokensData = useAppStore(selectMarketTokensData);
  const glvTokensData = useAppStore(selectGlvTokensData);

  // Fetch both GM Markets and GLV APY data in a single GraphQL query
  const { data: apyData, isLoading } = useSWR<CombinedApyResponse>(
    APY_DATA_KEY,
    async () => {
      try {
        const response = await fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              query {
                marketGmInfos {
                  apy
                  id
                }
                glvInfos {
                  apy
                  id
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
  console.log('apyData', apyData)
  // Process market tokens APY data
  const marketTokensAprData = useMemo(() => {
    const result: MarketTokensAPR = {};

    if (isLoading || !apyData?.data?.marketGmInfos) {
      Object.keys(marketTokensData).forEach((marketAddress) => {
        result[marketAddress] = BN_ZERO;
      });
      return result;
    }

    // Initialize all markets with zero APY
    Object.keys(marketTokensData).forEach((marketAddress) => {
      result[marketAddress] = BN_ZERO;
    });

    // Update markets with APY data from SQD
    apyData.data.marketGmInfos.forEach((marketInfo) => {
      if (marketInfo.id in result) {
        // Convert APY to BN with 4 decimal places (multiply by 10000)
        const apyValue = parseFloat(marketInfo.apy);
        const apyBN = new BN(Math.floor(apyValue * 10000));
        result[marketInfo.id] = apyBN;
      }
    });

    return result;
  }, [marketTokensData, apyData, isLoading]);

  // Process GLV tokens APY data directly from API
  const glvTokensApyData = useMemo(() => {
    const result: MarketTokensAPR = {};

    if (isLoading || !apyData?.data?.glvInfos) {
      Object.keys(glvTokensData).forEach((glvAddress) => {
        result[glvAddress] = BN_ZERO;
      });
      return result;
    }

    // Initialize all GLVs with zero APY
    Object.keys(glvTokensData).forEach((glvAddress) => {
      result[glvAddress] = BN_ZERO;
    });

    // Update GLVs with APY data from SQD
    apyData.data.glvInfos.forEach((glvInfo) => {
      if (glvInfo.id in result) {
        // Convert APY to BN with 4 decimal places (multiply by 10000)
        const apyValue = parseFloat(glvInfo.apy);
        const apyBN = new BN(Math.floor(apyValue * 10000));
        result[glvInfo.id] = apyBN;
      }
    });

    return result;
  }, [glvTokensData, apyData, isLoading]);

  return {
    marketTokensAprData,
    glvTokensApyData,
  };
}
