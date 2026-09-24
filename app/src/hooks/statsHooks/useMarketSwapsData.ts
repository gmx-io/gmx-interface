import { GRAPHQL_ENDPOINT } from '@/config/url';
import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import useSWR from 'swr';
import { useAppStore } from '@/zustand/useAppStore';

export interface ChartSwapItem {
  id: string;
  timestamp: string;
  marketToken: PublicKey;
  isTokenInLong: boolean;
  tokenInAmount: BN;
  tokenOutAmount: BN;
  priceImpactValue: BN;
  tokenInFeeAmountForPool: BN;
  tokenInFeeAmountForReceiver: BN;
  pricesLongTokenPriceMin: BN;
  pricesLongTokenPriceMax: BN;
  pricesShortTokenPriceMin: BN;
  pricesShortTokenPriceMax: BN;
}

interface GraphQLSwapExecuted {
  id: string;
  owner: string;
  reportParamsIsTokenInLong: string;
  timestamp: string;
  marketToken: string;
  reportParamsTokenInAmount: string;
  reportResultTokenOutAmount: string;
  reportResultPriceImpactValue: string;
  reportResultTokenInFeesFeeAmountForPool: string;
  reportResultTokenInFeesFeeAmountForReceiver: string;
  reportParamsPricesLongTokenPriceMin: string;
  reportParamsPricesLongTokenPriceMax: string;
  reportParamsPricesShortTokenPriceMin: string;
  reportParamsPricesShortTokenPriceMax: string;
}

interface GraphQLResponse {
  data: {
    swapExecutedContexts: GraphQLSwapExecuted[];
  };
}

const MARKET_SWAPS_KEY = 'data_store/market_swaps';
const MAX_SWAPS = 50; // Limit to 50 most recent swaps

export const useMarketSwapsData = () => {
  const { marketInfo, marketDirection } = useAppStore((state) => state.markets);
  // console.log('selectSwapReceiveToken', marketInfo, selectSwapReceiveToken)


  const { data, isLoading } = useSWR<ChartSwapItem[]>(
    marketInfo.marketToken ? `${MARKET_SWAPS_KEY}-${marketInfo.marketToken.toString()}-${marketDirection}` : null,
    async () => {
      try {
        const response = await fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              query {
                swapExecutedContexts(
                  limit: ${MAX_SWAPS},
                  orderBy: timestamp_DESC
                ) {
                  id
                  owner
                  reportParamsIsTokenInLong
                  timestamp
                  marketToken
                  reportParamsTokenInAmount
                  reportResultTokenOutAmount
                  reportResultPriceImpactValue
                  reportResultTokenInFeesFeeAmountForPool
                  reportResultTokenInFeesFeeAmountForReceiver
                  reportParamsPricesLongTokenPriceMin
                  reportParamsPricesLongTokenPriceMax
                  reportParamsPricesShortTokenPriceMin
                  reportParamsPricesShortTokenPriceMax
                }
              }
            `,
          }),
        });

        const result = (await response.json()) as GraphQLResponse;

        if (!result.data?.swapExecutedContexts) {
          throw new Error('Invalid response format');
        }

        return result.data.swapExecutedContexts.map((item) => ({
          id: `${item.marketToken}-${item.timestamp}-${item.owner.substring(0, 8)}`,
          timestamp: item.timestamp,
          marketToken: new PublicKey(item.marketToken),
          isTokenInLong: item.reportParamsIsTokenInLong === 'true',
          tokenInAmount: new BN(item.reportParamsTokenInAmount),
          tokenOutAmount: new BN(item.reportResultTokenOutAmount),
          priceImpactValue: new BN(item.reportResultPriceImpactValue),
          tokenInFeeAmountForPool: new BN(
            item.reportResultTokenInFeesFeeAmountForPool
          ),
          tokenInFeeAmountForReceiver: new BN(
            item.reportResultTokenInFeesFeeAmountForReceiver
          ),
          pricesLongTokenPriceMin: new BN(
            item.reportParamsPricesLongTokenPriceMin
          ),
          pricesLongTokenPriceMax: new BN(
            item.reportParamsPricesLongTokenPriceMax
          ),
          pricesShortTokenPriceMin: new BN(
            item.reportParamsPricesShortTokenPriceMin
          ),
          pricesShortTokenPriceMax: new BN(
            item.reportParamsPricesShortTokenPriceMax
          ),
        }));
      } catch (error) {
        console.error('Error fetching market swaps data:', error);
        return [];
      }
    },
    {
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  );

  return {
    swaps: data ?? [],
    isLoading,
  };
};
