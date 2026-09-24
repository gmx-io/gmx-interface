import { getGmw394Enabled } from '@/config/featureFlagEnable';
import { GRAPHQL_ENDPOINT } from '@/config/url';
import { useAppStore } from '@/zustand/useAppStore';
import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import useSWR from 'swr';
import { useShallow } from 'zustand/react/shallow';

export interface TradeItem {
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
  amount: BN;
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
  afterCollateralAmount: string,
  beforeCollateralAmount: string
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

const MARKET_TRADES_KEY = 'data_store/market_trades';

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

export const useMarketTradesData = () => {
  const { marketDirection } = useAppStore(useShallow((state) => state.TradeboxNew));
  const { marketInfo, marketInfos } = useAppStore(useShallow((state) => state.markets));
  const filterZeroSizeTrades = getGmw394Enabled();
  const queryLimit = filterZeroSizeTrades ? 100 : 50;

  const { data, isLoading } = useSWR<TradeItem[]>(
    // marketInfo.marketToken ? `${MARKET_TRADES_KEY}-${marketInfo.marketToken.toString()}-${marketDirection}` : null,
    marketInfo.marketToken
      ? [MARKET_TRADES_KEY, marketInfo.marketToken.toString(), marketDirection, filterZeroSizeTrades]
      : null,
    async () => {
      try {
        const marketTokens = marketInfos.map(info => info.marketToken.toString());

        const response = await fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              query {
                tradeEvents(
                  limit: ${queryLimit}
                  orderBy: timestamp_DESC,
                  where: {
                    marketToken_in: ${JSON.stringify(marketTokens)}
                  }
                ) {
                  flags
                  timestamp
                  marketToken
                  priceImpactValue
                  executionPrice
                  order
                  afterSizeInUsd
                  beforeSizeInUsd
                  afterCollateralAmount
                  beforeCollateralAmount
                }
                orderRemoveds(
                  limit: ${queryLimit}
                ) {
                  order
                  kind
                }
              }
            `,
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

        const trades = result.data.tradeEvents.map((item) => {
          const { isLong, isIncrease, isCollateralLong } = parseFlags(
            item.flags
          );
          const afterSize = new BN(item.afterSizeInUsd);
          const beforeSize = new BN(item.beforeSizeInUsd);

          const afterAmount = new BN(item.afterCollateralAmount);
          const beforeAmount = new BN(item.beforeCollateralAmount);

          return {
            id: `${item.order}-${item.timestamp}`,
            timestamp: item.timestamp,
            marketToken: new PublicKey(item.marketToken),
            order: item.order,
            kind: orderKindMap.get(item.order) ?? 'Unknown',
            isLong,
            isIncrease,
            isCollateralLong,
            size: afterSize.sub(beforeSize).abs(), // Use absolute value for display
            amount: afterAmount.sub(beforeAmount).abs(),
            executionPrice: new BN(item.executionPrice),
            priceImpact: new BN(item.priceImpactValue || '0'),
          };
        });

        if (!filterZeroSizeTrades) {
          return trades;
        }

        // Filter out collateral-only adjustments (size unchanged), keep 50 most recent
        return trades.filter((trade) => !trade.size.isZero()).slice(0, 50);
      } catch (error) {
        console.error('Error fetching market trades:', error);
        return [];
      }
    },
    {
      refreshInterval: 10000, // Refresh every 10 seconds
    }
  );

  return {
    trades: data ?? [],
    isLoading,
  };
};
