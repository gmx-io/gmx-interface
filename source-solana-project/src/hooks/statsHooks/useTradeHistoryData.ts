import { GRAPHQL_ENDPOINT } from '@/config/url';
import { useAnchor } from '@/contexts/anchor';
import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import useSWR from 'swr';

export interface HistoryItem {
  id: string;
  timestamp: string;
  marketToken: PublicKey;
  order: string;
  kind: string;
  isLong: boolean;
  isIncrease: boolean;
  isCollateralLong: boolean;
  size: BN;
  executionPrice: BN;
  priceImpact: BN;
  pnl: BN;
  beforeCollateralAmount: BN;
  afterCollateralAmount: BN;
  feesTotalBorrowingFeeAmount: BN;
  feesOrderFeeForPoolAmount: BN;
  feesOrderFeeForReceiverAmount: BN;
  pricesLongMax: BN;
  pricesLongMin: BN;
  pricesShortMax: BN;
  pricesShortMin: BN;
  pricesIndexMin: BN;
  pricesIndexMax: BN;
  longTokenPrice: BN;
  shortTokenPrice: BN;
  indexTokenPrice: BN;
  priceImpactValue: BN;
  feesLiquidationFeeAmount: BN;
  feesFundingFeeAmount: BN;
  feesClaimableFundingFeeLongTokenAmount: BN;
  feesClaimableFundingFeeShortTokenAmount: BN;
}

interface GraphQLTradeEvent {
  flags: string;
  timestamp: string;
  marketToken: string;
  priceImpactValue: string;
  executionPrice: string;
  order: string;
  afterSizeInUsd: string;
  beforeSizeInUsd: string;
  pnlPnl: string;
  beforeCollateralAmount: string;
  afterCollateralAmount: string;
  feesTotalBorrowingFeeAmount: BN;
  feesOrderFeeForPoolAmount: BN;
  feesOrderFeeForReceiverAmount: BN;
  pricesLongMax: BN;
  pricesLongMin: BN;
  pricesShortMax: BN;
  pricesShortMin: BN;
  pricesIndexMin: BN;
  pricesIndexMax: BN;
  feesFundingFeeAmount: string;
  feesClaimableFundingFeeLongTokenAmount: string;
  feesClaimableFundingFeeShortTokenAmount: string;
  feesLiquidationFeeAmount: string;
}

interface GraphQLOrderRemoved {
  order: string;
  kind: string;
}

interface GraphQLResponse {
  data: {
    tradeEvents: GraphQLTradeEvent[];
    orderRemoveds: GraphQLOrderRemoved[];
  };
}

const HISTORY_KEY = 'data_store/trade_history';
const TRADE_HISTORY_QUERY = `
  query TradeHistory($owner: String!) {
    tradeEvents(where: { user_eq: $owner }) {
      flags
      timestamp
      marketToken
      priceImpactValue
      executionPrice
      order
      afterSizeInUsd
      beforeSizeInUsd
      pnlPnl
      beforeCollateralAmount
      afterCollateralAmount
      feesTotalBorrowingFeeAmount
      feesOrderFeeForPoolAmount
      feesOrderFeeForReceiverAmount
      pricesLongMax
      pricesLongMin
      pricesShortMax
      pricesShortMin
      feesTotalBorrowingFeeAmount
      feesFundingFeeAmount
      feesClaimableFundingFeeLongTokenAmount
      feesClaimableFundingFeeShortTokenAmount
      feesOrderFeeForReceiverAmount
      feesOrderFeeForPoolAmount
      priceImpactValue
      feesLiquidationFeeAmount
    }
    orderRemoveds(where: { owner_eq: $owner }) {
      order
      kind
    }
  }
`;

function parseFlags(flags: string): {
  isLong: boolean;
  isIncrease: boolean;
  isCollateralLong: boolean;
} {
  const flagsNum = parseInt(flags);
  return {
    isLong: (flagsNum & 1) === 1, // IsLong is bit 0
    isCollateralLong: (flagsNum & 2) === 2, // IsCollateralLong is bit 1
    isIncrease: (flagsNum & 4) === 4, // IsIncrease is bit 2
  };
}

export const useTradeHistoryData = () => {
  const { owner } = useAnchor();

  const { data, isLoading } = useSWR<HistoryItem[]>(
    owner ? [HISTORY_KEY, owner.toBase58()] : null,
    async ([, ownerAddress]: [string, string]) => {
      try {
        const response = await fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: TRADE_HISTORY_QUERY,
            variables: {
              owner: ownerAddress,
            },
          }),
        });

        const result = (await response.json()) as GraphQLResponse;

        if (!result.data?.tradeEvents) {
          throw new Error('Invalid response format');
        }

        // Create a map of order to kind from orderRemoveds
        const orderKindMap = new Map(
          result.data.orderRemoveds.map((item) => [item.order, item.kind])
        );

        return result.data.tradeEvents.map((item) => {
          const { isLong, isIncrease, isCollateralLong } = parseFlags(
            item.flags
          );
          const afterSize = new BN(item.afterSizeInUsd);
          const beforeSize = new BN(item.beforeSizeInUsd);
          const paidBorrowingFee = new BN(item.feesTotalBorrowingFeeAmount).add(new BN(item.feesOrderFeeForPoolAmount)).add(new BN(item.feesOrderFeeForReceiverAmount));
          const price = isLong ? new BN(item.pricesLongMin).add(new BN(item.pricesLongMax)).div(new BN(2)) : new BN(item.pricesShortMin).add(new BN(item.pricesShortMax)).div(new BN(2));
          const feesTotalBorrowingFeeAmount = new BN(item.feesTotalBorrowingFeeAmount);
          const feesFundingFeeAmount = new BN(item.feesFundingFeeAmount);
          const feesClaimableFundingFeeLongTokenAmount = new BN(item.feesClaimableFundingFeeLongTokenAmount);
          const feesClaimableFundingFeeShortTokenAmount = new BN(item.feesClaimableFundingFeeShortTokenAmount);
          const feesOrderFeeForReceiverAmount = new BN(item.feesOrderFeeForReceiverAmount);
          const feesOrderFeeForPoolAmount = new BN(item.feesOrderFeeForPoolAmount);
          const longTokenPrice = new BN(item.pricesLongMin).add(new BN(item.pricesLongMax)).div(new BN(2));
          const shortTokenPrice = new BN(item.pricesShortMin).add(new BN(item.pricesShortMax)).div(new BN(2));
          const indexTokenPrice = new BN(item.pricesIndexMin).add(new BN(item.pricesIndexMax)).div(new BN(2));

          return {
            id: `${item.order}-${item.timestamp}`,
            timestamp: item.timestamp,
            marketToken: new PublicKey(item.marketToken),
            order: item.order,
            kind: orderKindMap.get(item.order) ?? 'Unknown',
            isLong,
            isIncrease,
            isCollateralLong,
            size: afterSize.sub(beforeSize),
            executionPrice: new BN(item.executionPrice),
            priceImpact: new BN(item.priceImpactValue || '0'),
            pnl: new BN(item.pnlPnl),
            beforeCollateralAmount: new BN(item.beforeCollateralAmount),
            afterCollateralAmount: new BN(item.afterCollateralAmount),
            paidBorrowingFee: paidBorrowingFee.mul(price),
            feesTotalBorrowingFeeAmount,
            feesFundingFeeAmount,
            feesClaimableFundingFeeLongTokenAmount,
            feesClaimableFundingFeeShortTokenAmount,
            feesOrderFeeForReceiverAmount,
            feesOrderFeeForPoolAmount,
            feesLiquidationFeeAmount: new BN(item.feesLiquidationFeeAmount || '0'),
            longTokenPrice,
            shortTokenPrice,
            indexTokenPrice
          };
        });
      } catch (error) {
        console.error('Error fetching history:', error);
        return [];
      }
    },
    {}
  );

  return {
    historyItems: data ?? [],
    isLoading,
  };
};
