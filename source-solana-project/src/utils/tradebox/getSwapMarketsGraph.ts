import { SWAP_GRAPH_MAX_MARKETS_PER_TOKEN } from '@/config/markets';
import { MarketInfo } from '@/selectors/market/types';
import { MarketEdge, MarketsGraph } from '@/selectors/trade/types';
import { getMarketAvailableLiquidityUsdForCollateral } from '@/utils/market/getMarketAvailableLiquidityUsdForCollateral';
import { isSameTokenAddress } from '@/utils/token/isSameTokenAddress';

export function getSwapMarketsGraph(markets: MarketInfo[]): MarketsGraph {
  const graph: MarketsGraph = {
    abjacencyList: {},
    edges: [],
  };

  const limitedMarkets = limitMarketsPerTokens(markets);

  for (const market of limitedMarkets) {
    const {
      longTokenAddress,
      shortTokenAddress,
      marketTokenAddress,
      isSingle,
      isDisabled,
    } = market;

    if (isSingle || isDisabled) continue;

    const longShortEdge: MarketEdge = {
      marketInfo: market,
      marketAddress: marketTokenAddress.toBase58(),
      from: longTokenAddress.toBase58(),
      to: shortTokenAddress.toBase58(),
    };

    const shortLongEdge: MarketEdge = {
      marketInfo: market,
      marketAddress: marketTokenAddress.toBase58(),
      from: shortTokenAddress.toBase58(),
      to: longTokenAddress.toBase58(),
    };

    graph.abjacencyList[longTokenAddress.toBase58()] =
      graph.abjacencyList[longTokenAddress.toBase58()] || [];
    graph.abjacencyList[longTokenAddress.toBase58()].push(longShortEdge);
    graph.abjacencyList[shortTokenAddress.toBase58()] =
      graph.abjacencyList[shortTokenAddress.toBase58()] || [];
    graph.abjacencyList[shortTokenAddress.toBase58()].push(shortLongEdge);

    graph.edges.push(longShortEdge, shortLongEdge);
  }

  return graph;
}

function limitMarketsPerTokens(markets: MarketInfo[]): MarketInfo[] {
  const marketsByTokens: { [token: string]: MarketInfo[] } = {};

  for (const market of markets) {
    if (market.isSingle || market.isDisabled) {
      continue;
    }

    const { longTokenAddress, shortTokenAddress } = market;

    marketsByTokens[longTokenAddress.toBase58()] =
      marketsByTokens[longTokenAddress.toBase58()] || [];
    marketsByTokens[longTokenAddress.toBase58()].push(market);

    marketsByTokens[shortTokenAddress.toBase58()] =
      marketsByTokens[shortTokenAddress.toBase58()] || [];
    marketsByTokens[shortTokenAddress.toBase58()].push(market);
  }

  const resultMarkets: { [marketAddress: string]: MarketInfo } = {};

  const tokenAddresses = Object.keys(marketsByTokens);

  for (const tokenAddress of tokenAddresses) {
    const markets = marketsByTokens[tokenAddress];

    const sortedMarkets = markets.sort((m1, m2) => {
      const liq1 = getMarketAvailableLiquidityUsdForCollateral(
        m1,
        isSameTokenAddress(m1.longTokenAddress, tokenAddress)
      );
      const liq2 = getMarketAvailableLiquidityUsdForCollateral(
        m2,
        isSameTokenAddress(m2.longTokenAddress, tokenAddress)
      );
      return liq2.gt(liq1) ? 1 : liq2.lt(liq1) ? -1 : 0;
    });

    let marketsPerTokenCount = 0;

    for (const market of sortedMarkets) {
      if (
        marketsPerTokenCount > SWAP_GRAPH_MAX_MARKETS_PER_TOKEN ||
        resultMarkets[market.marketTokenAddress.toBase58()]
      ) {
        break;
      }

      resultMarkets[market.marketTokenAddress.toBase58()] = market;
      marketsPerTokenCount++;
    }
  }

  return Object.values(resultMarkets);
}
