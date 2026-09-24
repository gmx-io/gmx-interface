import { useCallback, useRef } from 'react';
import { useAppStore } from '@/zustand/useAppStore';
import { selectAvailableChartTokens } from '@/selectors/chart/selectAvailableChartTokens';
import { selectMarketsInfo } from '@/selectors/market/selectMarketsInfo';
import { selectSetTradeboxMarketTokenAddress } from '@/selectors/tradebox/baseSelectors';
import { selectTradeboxMarketTokenAddress } from '@/selectors/tradebox/selectTradeboxMarketTokenAddress';
import { useTokenLiquidity } from '@/components/Selectors/ChartTokenSelector/hooks/useTokenLiquidity';
import { BN } from '@coral-xyz/anchor';
import { getMarketAvailableLiquidityUsdForCollateral } from '@/utils/market/getMarketAvailableLiquidityUsdForCollateral';
import { getTokenPoolType } from '@/utils/market/getTokenPoolType';

/**
 * Hook to find the token with the highest available liquidity and set it as the chart token
 */
export function useHighestLiquidityToken() {
  const availableTokens = useAppStore(selectAvailableChartTokens);
  const marketsInfo = useAppStore(selectMarketsInfo);
  const setTradeboxMarketTokenAddress = useAppStore(
    selectSetTradeboxMarketTokenAddress
  );
  const currentMarketTokenAddress = useAppStore(
    selectTradeboxMarketTokenAddress
  );
  const { calculateTokenLiquidity } = useTokenLiquidity();

  // Use a ref to track the last set market token address to prevent loops
  const lastSetAddressRef = useRef<string | null>(null);

  const findHighestLiquidityToken = useCallback(() => {
    if (!availableTokens.length || !marketsInfo) return null;

    let highestLiquidityToken = null;
    let highestLiquidityValue = new BN(0);

    // Calculate liquidity for each token and find the one with highest value
    for (const token of availableTokens) {
      const liquidity = calculateTokenLiquidity(token, marketsInfo);

      if (liquidity.value.gt(highestLiquidityValue)) {
        highestLiquidityValue = liquidity.value;
        highestLiquidityToken = token;
      }
    }

    return highestLiquidityToken;
  }, [availableTokens, marketsInfo, calculateTokenLiquidity]);

  const setHighestLiquidityTokenAsChart = useCallback(() => {
    const token = findHighestLiquidityToken();
    if (!token) return;

    // Find the market with highest liquidity for this token
    const tokenAddress = token.address.toBase58();
    const relevantMarkets = Object.values(marketsInfo).filter(
      (m) =>
        m.longToken.address.toBase58() === tokenAddress ||
        m.shortToken.address.toBase58() === tokenAddress ||
        m.indexToken.address.toBase58() === tokenAddress
    );

    if (relevantMarkets.length === 0) return;

    // Find the market with highest liquidity for this token
    let highestLiquidityMarket = relevantMarkets[0];
    let highestLiquidity = new BN(0);

    for (const market of relevantMarkets) {
      const isLong = getTokenPoolType(market, tokenAddress) === 'long';
      const liquidity =
        getMarketAvailableLiquidityUsdForCollateral(market, isLong) ||
        new BN(0);

      if (liquidity.gt(highestLiquidity)) {
        highestLiquidity = liquidity;
        highestLiquidityMarket = market;
      }
    }

    // Get the new market token address
    const marketTokenAddress =
      highestLiquidityMarket.marketTokenAddress.toBase58();

    // Only set if different from current AND we haven't just set this same address
    if (
      currentMarketTokenAddress !== marketTokenAddress &&
      lastSetAddressRef.current !== marketTokenAddress
    ) {
      // Update the ref to record what we're setting
      lastSetAddressRef.current = marketTokenAddress;
      setTradeboxMarketTokenAddress(marketTokenAddress);
    }
  }, [
    findHighestLiquidityToken,
    marketsInfo,
    setTradeboxMarketTokenAddress,
    currentMarketTokenAddress,
  ]);

  return {
    findHighestLiquidityToken,
    setHighestLiquidityTokenAsChart,
  };
}
