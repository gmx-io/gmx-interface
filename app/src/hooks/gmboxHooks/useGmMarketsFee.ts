import { BN_ZERO } from '@/config/constants';
import { GRAPHQL_ENDPOINT } from '@/config/url';
import { selectGlvsInfo } from '@/selectors/glv/selectGlvsInfo';
import { MarketTokensFee } from '@/selectors/market/types';
import { selectGlvTokensData } from '@/selectors/token/selectGlvTokensData';
import { selectMarketTokensData } from '@/selectors/token/selectMarketTokensData';
import { useAppStore } from '@/zustand/useAppStore';
import { BN } from '@coral-xyz/anchor';
import { useMemo } from 'react';
import useSWR from 'swr';

type GmGlvTokensFeeResult = {
  marketTokensFeeData: MarketTokensFee;
  glvTokensFeeData: MarketTokensFee;
};

interface CombinedDataResponse {
  data: {
    marketTotalStats: Array<{
      id: string;
      totalFees: string;
      totalRevenue: string;
    }>;
    marketGmUserHourlies: Array<{
      owner: string;
      totalFees: string;
      marketToken: string;
      timestamp: string;
    }>;
  };
}

// Specific GLV token address we need to handle
const SPECIFIC_GLV_TOKEN_ADDRESS =
  '7r3XADNMW12k8QiLPaFjW1giYMJNZzUjmDA5HiK7hAPu';
// Specific GLV account owner address
const SPECIFIC_GLV_ACCOUNT_OWNER =
  'fh3nAdi3P4tYKssVX9AAh9ZmMnek497qz6hPKKL1DPQ';

const COMBINED_DATA_KEY = 'data_store/combined_gm_glv_data';

export function useGmMarketsFee(): GmGlvTokensFeeResult {
  const marketTokensData = useAppStore(selectMarketTokensData);
  const glvTokensData = useAppStore(selectGlvTokensData);
  const glvsInfo = useAppStore(selectGlvsInfo);

  // Fetch combined data from SQD GraphQL API in a single request
  const { data: combinedData, isLoading } = useSWR<CombinedDataResponse>(
    COMBINED_DATA_KEY,
    async () => {
      try {
        // Extract owner addresses from all GLVs to include in the query
        const allOwnersToFetch = [SPECIFIC_GLV_ACCOUNT_OWNER];
        // Add more owners here if needed for other GLVs

        const ownersCondition =
          allOwnersToFetch.length > 0
            ? `owner_in: [${allOwnersToFetch.map((addr) => `"${addr}"`).join(', ')}]`
            : `owner_eq: "${SPECIFIC_GLV_ACCOUNT_OWNER}"`;

        const response = await fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              query {
                marketTotalStats {
                  id
                  totalFees
                  totalRevenue
                }
                marketGmUserHourlies(
                  where: {${ownersCondition}},
                  orderBy: timestamp_DESC
                ) {
                  owner
                  totalFees
                  marketToken
                  timestamp
                }
              }
            `,
          }),
        });

        const result = (await response.json()) as CombinedDataResponse;
        return result;
      } catch (error) {
        console.error('Error fetching combined data:', error);
        return {
          data: {
            marketTotalStats: [],
            marketGmUserHourlies: [],
          },
        };
      }
    },
    {
      refreshInterval: 60000, // Refresh every minute
    }
  );

  // Process market tokens fee data
  const marketTokensFeeData = useMemo(() => {
    const result: MarketTokensFee = {};

    if (isLoading || !combinedData?.data?.marketTotalStats) {
      Object.keys(marketTokensData).forEach((marketAddress) => {
        result[marketAddress] = BN_ZERO;
      });
      return result;
    }

    // Initialize all markets with zero fee
    Object.keys(marketTokensData).forEach((marketAddress) => {
      result[marketAddress] = BN_ZERO;
    });

    // Update markets with totalFees data from SQD
    combinedData.data.marketTotalStats.forEach((marketStat) => {
      if (marketStat.id in result) {
        // For GM tokens, use totalFees - totalRevenue to get LP fees
        const totalRevenue = new BN(marketStat.totalRevenue || '0');
        const totalFees = new BN(marketStat.totalFees);
        const lpFees = totalFees.sub(totalRevenue);

        // Ensure lpFees is not negative
        result[marketStat.id] = lpFees.gt(BN_ZERO) ? lpFees : BN_ZERO;
      }
    });

    return result;
  }, [marketTokensData, combinedData, isLoading]);

  // Calculate GLV tokens fee data
  const glvTokensFeeData = useMemo(() => {
    const result: MarketTokensFee = {};

    // Initialize all GLVs with zero fee
    Object.keys(glvTokensData).forEach((glvAddress) => {
      result[glvAddress] = BN_ZERO;
    });

    if (isLoading || !combinedData?.data?.marketGmUserHourlies) {
      return result;
    }

    // Group data by owner for easier processing
    const dataByOwner: Record<
      string,
      Record<string, (typeof combinedData.data.marketGmUserHourlies)[0]>
    > = {};

    // Process marketGmUserHourlies to get the latest data for each market per owner
    combinedData.data.marketGmUserHourlies.forEach((entry) => {
      const { owner, marketToken } = entry;

      if (!dataByOwner[owner]) {
        dataByOwner[owner] = {};
      }

      if (
        !dataByOwner[owner][marketToken] ||
        new Date(entry.timestamp) >
          new Date(dataByOwner[owner][marketToken].timestamp)
      ) {
        dataByOwner[owner][marketToken] = entry;
      }
    });

    // Calculate fees for the specific GLV (direct sum of totalFees)
    if (dataByOwner[SPECIFIC_GLV_ACCOUNT_OWNER]) {
      let totalFees = BN_ZERO;

      Object.values(dataByOwner[SPECIFIC_GLV_ACCOUNT_OWNER]).forEach(
        (entry) => {
          totalFees = totalFees.add(new BN(entry.totalFees));
        }
      );

      if (SPECIFIC_GLV_TOKEN_ADDRESS in glvTokensData) {
        result[SPECIFIC_GLV_TOKEN_ADDRESS] = totalFees;
      }
    }

    // For other GLVs, directly use the sum of market fees
    if (combinedData?.data?.marketTotalStats) {
      // Create maps for quick lookups
      const marketTotalFeesMap: Record<string, BN> = {};

      // Map market addresses to their total fees
      combinedData.data.marketTotalStats.forEach((marketStat) => {
        const totalRevenue = new BN(marketStat.totalRevenue || '0');
        const totalFees = new BN(marketStat.totalFees);
        const lpFees = totalFees.sub(totalRevenue);

        // Ensure lpFees is not negative
        marketTotalFeesMap[marketStat.id] = lpFees.gt(BN_ZERO)
          ? lpFees
          : BN_ZERO;
      });

      // Process GLVs that don't have direct marketGmUserHourlies data
      Object.entries(glvsInfo).forEach(([glvAddress, glvInfo]) => {
        // Skip the specific GLV token as we've already calculated it
        if (glvAddress === SPECIFIC_GLV_TOKEN_ADDRESS) {
          return;
        }

        let totalFee = BN_ZERO;

        // Directly sum the fees from the market tokens for this GLV
        glvInfo.markets.forEach((market) => {
          const marketAddress = market.marketTokenAddress.toBase58();
          // Use the market's total fees directly from marketTotalFeesMap
          const marketFee = marketTotalFeesMap[marketAddress] || BN_ZERO;
          totalFee = totalFee.add(marketFee);
        });

        result[glvAddress] = totalFee;
      });
    }

    return result;
  }, [glvsInfo, glvTokensData, combinedData, isLoading]);

  return {
    marketTokensFeeData,
    glvTokensFeeData,
  };
}
