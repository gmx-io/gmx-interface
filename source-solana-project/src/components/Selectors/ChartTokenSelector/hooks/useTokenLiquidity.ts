import { BN_ZERO } from '@/config/constants';
import { WRAPPED_NATIVE_TOKEN_ADDRESS } from '@/config/tokens';
import { MarketInfo } from '@/selectors/market/types';
import { TokenData } from '@/selectors/token/types';
import { convertUsdToTokenAmount } from '@/utils/legacy';
import { getMarketAvailableLiquidityUsdForCollateral } from '@/utils/market/getMarketAvailableLiquidityUsdForCollateral';
import { getTokenPoolType } from '@/utils/market/getTokenPoolType';
import { BN } from '@coral-xyz/anchor';

export const useTokenLiquidity = () => {
  const calculateTokenLiquidity = (
    token: TokenData,
    marketsInfo: Record<string, MarketInfo>
  ) => {
    const tokenAddress =
      token.symbol === 'SOL'
        ? WRAPPED_NATIVE_TOKEN_ADDRESS.toBase58()
        : token.address.toBase58();

    const relevantMarkets = Object.values(marketsInfo).filter(
      (m) =>
        m.longToken.address.toBase58() === tokenAddress ||
        m.shortToken.address.toBase58() === tokenAddress
    );

    if (relevantMarkets.length === 0)
      return { amount: BN_ZERO, value: BN_ZERO };

    const totalLiquidityUsd = relevantMarkets.reduce((acc: BN, market) => {
      const isLong = getTokenPoolType(market, tokenAddress) === 'long';
      const liquidityUsd =
        getMarketAvailableLiquidityUsdForCollateral(market, isLong) || BN_ZERO;
      return acc.add(liquidityUsd);
    }, BN_ZERO);

    const totalLiquidityAmount = relevantMarkets.reduce((acc: BN, market) => {
      const isLong = getTokenPoolType(market, tokenAddress) === 'long';
      const liquidityUsd =
        getMarketAvailableLiquidityUsdForCollateral(market, isLong) || BN_ZERO;
      const liquidityAmount =
        convertUsdToTokenAmount(
          liquidityUsd,
          token.decimals,
          token.prices?.maxPrice
        ) ?? BN_ZERO;
      return acc.add(liquidityAmount);
    }, BN_ZERO);

    return {
      amount: totalLiquidityAmount,
      value: totalLiquidityUsd,
    };
  };

  return {
    calculateTokenLiquidity,
  };
};
