import { selectIsPricesInitialized, selectPrices } from '@/selectors/token/baseSelectors';
import { selectSetAllPrices, selectSetAllTokens } from '@/selectors/token/baseSelectors';
import { selectResetTradeOptions, selectSetTradeboxMarketTokenAddress } from '@/selectors/tradebox/baseSelectors';
import { selectTradeboxMarketTokenAddress } from '@/selectors/tradebox/selectTradeboxMarketTokenAddress';
import { GMX_SOLANA_TOKENS } from '@/config/program';
import { useAppStore } from '@/zustand/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useEffect, useRef } from 'react';
import { useMarkets } from './useMarkets';
import { useMarketsStatus } from './useMarketsStatus';
import { usePriceFromFeeds } from './usePriceFromFeeds';

const TOKEN_ADDRESSES = Object.keys(GMX_SOLANA_TOKENS);

/**
 * Mounts the full on-chain market + token data pipeline needed for:
 * - VOB (Virtual Order Book)
 * - selectMarketsInfo / selectMarketTokensStat
 * - selectTradeboxMarketInfo / selectTradeboxMarkPrice
 *
 * Also syncs the socket-based market selection (state.markets.marketInfo.marketToken)
 * to tradeOptions so selectTradeboxMarketTokenAddress returns the correct LP token address.
 *
 * Must be mounted inside AnchorStateProvider context.
 */
export function useMarketsData() {
  const setAllTokens = useAppStore(selectSetAllTokens);
  const setAllPrices = useAppStore(selectSetAllPrices);
  const setTradeboxMarketTokenAddress = useAppStore(selectSetTradeboxMarketTokenAddress);
  const resetOptions = useAppStore(selectResetTradeOptions);
  const currentMarketTokenAddress = useAppStore(selectTradeboxMarketTokenAddress);

  // Initialize token metadata once from static config
  const tokensInitialized = useRef(false);
  useEffect(() => {
    if (!tokensInitialized.current) {
      setAllTokens(GMX_SOLANA_TOKENS);
      tokensInitialized.current = true;
    }
  }, [setAllTokens]);

  // Fetch BN-format prices from API (needed for selectTradeboxMarkPrice and price impact calcs)
  const prices = usePriceFromFeeds({ addresses: TOKEN_ADDRESSES });
  useEffect(() => {
    if (prices && Object.keys(prices).length > 0) {
      setAllPrices(prices);
    }
  }, [prices, setAllPrices]);

  // Fetch static on-chain market data (Market meta + MarketState config)
  const { isLoading: isMarketsLoading } = useMarkets({ enableRefresh: true });

  const { marketsOnChain, tokenStatePrices, isPricesInitialized, socketMarketInfo } =
    useAppStore(
      useShallow((state) => ({
        marketsOnChain: state.markets.marketsOnChain,
        tokenStatePrices: selectPrices(state),
        isPricesInitialized: selectIsPricesInitialized(state),
        socketMarketInfo: state.markets.marketInfo,
      }))
    );
  const marketsOnChainRef = useRef(marketsOnChain);
  marketsOnChainRef.current = marketsOnChain;

  const markets = Object.values(marketsOnChain);

  // Fetch dynamic market status (pool values, reserve values, pending PnL)
  useMarketsStatus(
    markets,
    tokenStatePrices,
    isPricesInitialized,
    !isMarketsLoading
  );

  // Sync socket-based market selection to tradeOptions so selectTradeboxMarketTokenAddress returns
  // the LP token address and selectMarketsInfo / VOB can find the correct MarketInfo.
  // Flow: resetOptions(market) sets indexTokenAddress → setTradeboxMarketTokenAddress(lp) stores lp
  // Also retries when marketsOnChain loads (in case socket data arrived first).
  const hasMarkets = markets.length > 0;
  useEffect(() => {
    const lpTokenAddress = (
      socketMarketInfo as { marketToken?: string } | undefined
    )?.marketToken;
    if (!lpTokenAddress || lpTokenAddress === currentMarketTokenAddress) return;
    const market = marketsOnChainRef.current[lpTokenAddress];
    if (!market) return;
    resetOptions(market);
    setTradeboxMarketTokenAddress(lpTokenAddress);
  }, [socketMarketInfo, currentMarketTokenAddress, hasMarkets, resetOptions, setTradeboxMarketTokenAddress]);
}
