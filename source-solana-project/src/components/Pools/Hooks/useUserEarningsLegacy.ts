import { useMemo } from 'react';
import { BN_ZERO } from '@/config/constants';
import { BN } from '@coral-xyz/anchor';
import useSWR from 'swr';
import { GRAPHQL_ENDPOINT } from '@/config/url';
import { useWallet } from '@solana/wallet-adapter-react';

interface UserEarningsResponse {
  data: {
    marketGmUserHourlies: Array<{
      totalFees7d: string;
      totalFees: string;
      marketToken: string;
      owner: string;
      timestamp: string;
    }>;
    glvUserHourlies: Array<{
      totalFees7d: string;
      totalFees: string;
      glvToken: string;
      owner: string;
      timestamp: string;
    }>;
  };
}

export type UserEarningsResult = {
  byMarketAddress: {
    [marketAddress: string]: {
      total: BN;
      recent7d: BN;
      expected365d: BN;
    };
  };
  byGlvAddress: {
    [glvAddress: string]: {
      total: BN;
      recent7d: BN;
      expected365d: BN;
    };
  };
  allMarkets: {
    total: BN;
    recent7d: BN;
    expected365d: BN;
    totalAmount: BN;
    recent7dAmount: BN;
  };
  allGlvs: {
    total: BN;
    recent7d: BN;
    expected365d: BN;
  };
};

const USER_EARNINGS_KEY = 'data_store/user_earnings';

export function useUserEarningsLegacy(
  marketAddresses: string[],
  glvAddresses: string[],
  options?: { enabled?: boolean }
) {
  const enabled = options?.enabled !== false;
  const { publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58();
  const { data } = useSWR<UserEarningsResult>(
    enabled && walletAddress ? [USER_EARNINGS_KEY, walletAddress] : null,
    async () => {
      try {
        if (!walletAddress) {
          throw new Error('Wallet not connected');
        }

        // const marketAddresses = Object.keys(marketsInfoMap);
        const response = await fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              query {
                marketGmUserHourlies(
                  where: {
                    owner_eq: "${walletAddress}", 
                    marketToken_in: [${marketAddresses.map((addr) => `"${addr}"`).join(', ')}]
                  }, 
                  orderBy: timestamp_DESC
                ) {
                  totalFees7d
                  totalFees
                  marketToken
                  owner
                  timestamp
                }
                glvUserHourlies(
                  where: {
                    owner_eq: "${walletAddress}", 
                    glvToken_in: [${glvAddresses.map((addr) => `"${addr}"`).join(', ')}]
                  }, 
                  orderBy: timestamp_DESC
                ) {
                  totalFees7d
                  totalFees
                  glvToken
                  owner
                  timestamp
                }
              }
            `,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('GraphQL response not ok:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText,
          });
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = (await response.json()) as UserEarningsResponse;
        if (!result.data?.marketGmUserHourlies) {
          console.error('Invalid response structure:', result);
          throw new Error('Invalid response format');
        }

        // Group the latest data by market
        const latestDataByMarket: Record<
          string,
          (typeof result.data.marketGmUserHourlies)[0]
        > = {};

        // Get the latest entry for each market
        result.data.marketGmUserHourlies.forEach((entry) => {
          const marketAddress = entry.marketToken;
          if (!latestDataByMarket[marketAddress]) {
            latestDataByMarket[marketAddress] = entry;
          }
        });

        // Group the latest data by GLV
        const latestDataByGlv: Record<
          string,
          (typeof result.data.glvUserHourlies)[0]
        > = {};

        // Get the latest entry for each GLV
        if (result.data.glvUserHourlies) {
          result.data.glvUserHourlies.forEach((entry) => {
            const glvAddress = entry.glvToken;
            if (!latestDataByGlv[glvAddress]) {
              latestDataByGlv[glvAddress] = entry;
            }
          });
        }

        // Initialize result with all markets and GLVs
        const userEarnings: UserEarningsResult = {
          byMarketAddress: {},
          byGlvAddress: {},
          allMarkets: {
            totalAmount: BN_ZERO,
            total: BN_ZERO,
            recent7d: BN_ZERO,
            recent7dAmount: BN_ZERO,
            expected365d: BN_ZERO,
          },
          allGlvs: {
            total: BN_ZERO,
            recent7d: BN_ZERO,
            expected365d: BN_ZERO,
          },
        };

        // Initialize all markets with zero values
        marketAddresses.forEach((marketAddress) => {
          userEarnings.byMarketAddress[marketAddress] = {
            total: BN_ZERO,
            recent7d: BN_ZERO,
            expected365d: BN_ZERO,
          };
        });

        // Initialize all GLVs with zero values
        glvAddresses.forEach((glvAddress) => {
          userEarnings.byGlvAddress[glvAddress] = {
            total: BN_ZERO,
            recent7d: BN_ZERO,
            expected365d: BN_ZERO,
          };
        });

        // Process data for each market
        Object.entries(latestDataByMarket).forEach(([marketAddress, data]) => {
          const total = new BN(data.totalFees);
          const recent7d = new BN(data.totalFees7d);

          // Calculate expected yearly earnings based on actual time period
          let expected365d = recent7d.muln(365).divn(7); // Default fallback calculation

          // Get all entries for this market to calculate actual time period
          const marketEntries = result.data.marketGmUserHourlies.filter(
            (entry) => entry.marketToken === marketAddress
          );

          if (marketEntries.length > 1) {
            // Sort by timestamp in ascending order
            marketEntries.sort(
              (a, b) =>
                new Date(a.timestamp).getTime() -
                new Date(b.timestamp).getTime()
            );

            // Calculate hours between oldest and newest entry
            const oldestTimestamp = new Date(
              marketEntries[0].timestamp
            ).getTime();
            const newestTimestamp = new Date(
              marketEntries[marketEntries.length - 1].timestamp
            ).getTime();
            const hoursDiff =
              (newestTimestamp - oldestTimestamp) / (1000 * 60 * 60);

            if (hoursDiff > 0) {
              // Calculate hourly rate, then annualize (24 hours * 365 days)
              expected365d = recent7d
                .mul(new BN(24 * 365))
                .div(new BN(hoursDiff));
            }
          }

          userEarnings.byMarketAddress[marketAddress] = {
            total,
            recent7d,
            expected365d,
          };

          // Add to all markets totals
          userEarnings.allMarkets.total =
            userEarnings.allMarkets.total.add(total);
          userEarnings.allMarkets.recent7d =
            userEarnings.allMarkets.recent7d.add(recent7d);
          userEarnings.allMarkets.expected365d =
            userEarnings.allMarkets.expected365d.add(expected365d);
        });

        // Process data for each GLV
        Object.entries(latestDataByGlv).forEach(([glvAddress, data]) => {
          const total = new BN(data.totalFees);
          const recent7d = new BN(data.totalFees7d);

          // Calculate expected yearly earnings based on actual time period
          let expected365d = recent7d.muln(365).divn(7); // Default fallback calculation

          // Get all entries for this GLV to calculate actual time period
          const glvEntries = result.data.glvUserHourlies.filter(
            (entry) => entry.glvToken === glvAddress
          );

          if (glvEntries.length > 1) {
            // Sort by timestamp in ascending order
            glvEntries.sort(
              (a, b) =>
                new Date(a.timestamp).getTime() -
                new Date(b.timestamp).getTime()
            );

            // Calculate hours between oldest and newest entry
            const oldestTimestamp = new Date(glvEntries[0].timestamp).getTime();
            const newestTimestamp = new Date(
              glvEntries[glvEntries.length - 1].timestamp
            ).getTime();
            const hoursDiff =
              (newestTimestamp - oldestTimestamp) / (1000 * 60 * 60);

            if (hoursDiff > 0) {
              // Calculate hourly rate, then annualize (24 hours * 365 days)
              expected365d = recent7d
                .mul(new BN(24 * 365))
                .div(new BN(hoursDiff));
            }
          }

          userEarnings.byGlvAddress[glvAddress] = {
            total,
            recent7d,
            expected365d,
          };

          // Add to all GLVs totals
          userEarnings.allGlvs.total = userEarnings.allGlvs.total.add(total);
          userEarnings.allGlvs.recent7d =
            userEarnings.allGlvs.recent7d.add(recent7d);
          userEarnings.allGlvs.expected365d =
            userEarnings.allGlvs.expected365d.add(expected365d);
        });

        return userEarnings;
      } catch (error) {
        console.error('Error fetching user earnings:', error);

        // Return default data structure with zero values
        const defaultResult: UserEarningsResult = {
          byMarketAddress: {},
          byGlvAddress: {},
          allMarkets: {
            total: BN_ZERO,
            recent7d: BN_ZERO,
            expected365d: BN_ZERO,
            totalAmount: BN_ZERO,
            recent7dAmount: BN_ZERO,
          },
          allGlvs: {
            total: BN_ZERO,
            recent7d: BN_ZERO,
            expected365d: BN_ZERO,
          },
        };

        marketAddresses.forEach((marketAddress) => {
          defaultResult.byMarketAddress[marketAddress] = {
            total: BN_ZERO,
            recent7d: BN_ZERO,
            expected365d: BN_ZERO,
          };
        });

        glvAddresses.forEach((glvAddress) => {
          defaultResult.byGlvAddress[glvAddress] = {
            total: BN_ZERO,
            recent7d: BN_ZERO,
            expected365d: BN_ZERO,
          };
        });

        return defaultResult;
      }
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 300000, // Refresh every 5 minutes
    }
  );

  // If data is loading or wallet is not connected, return default structure
  const defaultData = useMemo(() => {
    const byMarketAddress: {
      [key: string]: { total: BN; recent7d: BN; expected365d: BN };
    } = {};

    marketAddresses.forEach((marketAddress) => {
      byMarketAddress[marketAddress] = {
        total: BN_ZERO,
        recent7d: BN_ZERO,
        expected365d: BN_ZERO,
      };
    });

    const byGlvAddress: {
      [key: string]: { total: BN; recent7d: BN; expected365d: BN };
    } = {};

    glvAddresses.forEach((glvAddress) => {
      byGlvAddress[glvAddress] = {
        total: BN_ZERO,
        recent7d: BN_ZERO,
        expected365d: BN_ZERO,
      };
    });

    return {
      byMarketAddress,
      byGlvAddress,
      allMarkets: {
        total: BN_ZERO,
        recent7d: BN_ZERO,
        expected365d: BN_ZERO,
        totalAmount: BN_ZERO,
        recent7dAmount: BN_ZERO,
      },
      allGlvs: {
        total: BN_ZERO,
        recent7d: BN_ZERO,
        expected365d: BN_ZERO,
      },
    };
  }, [marketAddresses, glvAddresses]);

  return data || defaultData;
}
