import { GRAPHQL_ENDPOINT } from '@/config/url';
import { useAnchor } from '@/contexts/anchor';
import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import useSWR from 'swr';

export interface SwapHistoryItem {
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

const SWAP_HISTORY_KEY = 'data_store/swap_history';

export const useSwapHistoryData = () => {
  const { owner } = useAnchor();

  const { data, isLoading } = useSWR<SwapHistoryItem[]>(
    owner ? [SWAP_HISTORY_KEY, owner.toBase58()] : null,
    async ([, ownerAddress]: [string, string]) => {
      try {
        const response = await fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              query {
                swapExecutedContexts(where: {owner_eq: "${String(ownerAddress)}"}) {
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
          id: `${item.marketToken}-${item.timestamp}`,
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
        console.error('Error fetching swap history:', error);
        return [];
      }
    },
    {}
  );

  // console.log('swap list data', data)

  return {
    historyItems: data ?? [],
    historySwapItems: data ?? [],
    isLoading,
    isLoadingSwap: isLoading,
  };
};
