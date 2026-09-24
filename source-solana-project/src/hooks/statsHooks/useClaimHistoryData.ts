import { GRAPHQL_ENDPOINT } from '@/config/url';
import { useAnchor } from '@/contexts/anchor';
import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import useSWR from 'swr';

export interface ClaimItem {
  id: string;
  timestamp: string;
  marketToken: PublicKey;
  feesClaimableFundingFeeLongTokenAmount: BN;
  feesClaimableFundingFeeShortTokenAmount: BN;
  pricesLongMax: BN;
  pricesShortMax: BN;
}

interface GraphQLClaimItem {
  flags: string;
  timestamp: string;
  marketToken: string;
  feesClaimableFundingFeeLongTokenAmount: string;
  feesClaimableFundingFeeShortTokenAmount: string;
  pricesLongMax: string;
  pricesShortMax: string;
  priceImpactValue: string;
}

interface GraphQLResponse {
  data: {
    tradeEvents: GraphQLClaimItem[];
  };
}

const CLAIM_KEY = 'data_store/claims';

export const useClaimHistoryData = () => {
  const { owner } = useAnchor();

  const { data, isLoading } = useSWR<ClaimItem[]>(
    owner ? [CLAIM_KEY, owner.toBase58()] : null,
    async ([, ownerAddress]: [string, string]) => {
      try {
        const response = await fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              query {
                tradeEvents(
                  where: {
                    user_eq: "${String(ownerAddress)}"
                  }
                ) {
                  flags
                  feesClaimableFundingFeeShortTokenAmount
                  feesClaimableFundingFeeLongTokenAmount
                  timestamp
                  marketToken
                  pricesLongMax
                  pricesShortMax
                  priceImpactValue
                }
              }
            `,
          }),
        });

        const result = (await response.json()) as GraphQLResponse;

        if (!result.data?.tradeEvents) {
          throw new Error('Invalid response format');
        }

        return result.data.tradeEvents.map((item) => ({
          id: `${item.marketToken}-${item.timestamp}`,
          timestamp: item.timestamp,
          marketToken: new PublicKey(item.marketToken),
          feesClaimableFundingFeeLongTokenAmount: new BN(
            item.feesClaimableFundingFeeLongTokenAmount || '0'
          ),
          feesClaimableFundingFeeShortTokenAmount: new BN(
            item.feesClaimableFundingFeeShortTokenAmount || '0'
          ),
          pricesLongMax: new BN(item.pricesLongMax || '0'),
          pricesShortMax: new BN(item.pricesShortMax || '0'),
          priceImpactValue: new BN(item.priceImpactValue || '0')
        }));
      } catch (error) {
        console.error('Error fetching claims:', error);
        return [];
      }
    },
    {}
  );

  return {
    claimItems: data ?? [],
    isLoading,
  };
};
