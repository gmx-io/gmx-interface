import { GMX_SOLANA_TOKENS_RAW } from '@/config/program';
import type { TokenType } from '@/selectors/token/types';
import { getNormalizedTokenSymbol } from '@/utils/token/getNormalizedTokenSymbol';
import { createAppStoreSelector } from '@/zustand/useAppStore';

type SwapSelectableToken = {
  tokenAddress?: string;
  tokenName?: string;
};

export type SwapChartToken = {
  tokenAddress?: string;
  tokenSymbol?: string;
  tokenType: TokenType;
};

const USDC_SYMBOL = 'USDC';

function getSwapTokenSymbol(token?: SwapSelectableToken) {
  if (!token) return undefined;

  return token.tokenAddress
    ? GMX_SOLANA_TOKENS_RAW[token.tokenAddress]?.symbol ?? token.tokenName
    : token.tokenName;
}

function getSwapTokenType(token?: SwapSelectableToken): TokenType {
  if (!token?.tokenAddress) return 'crypto';

  return GMX_SOLANA_TOKENS_RAW[token.tokenAddress]?.type ?? 'crypto';
}

function isUsdcToken(token?: SwapSelectableToken) {
  const tokenSymbol = getSwapTokenSymbol(token);

  return (
    tokenSymbol !== undefined &&
    getNormalizedTokenSymbol(tokenSymbol).toUpperCase() === USDC_SYMBOL
  );
}

export const selectSwapChartToken = createAppStoreSelector(
  [
    (state) => state.swap.selectSwapPayToken,
    (state) => state.swap.selectSwapReceiveToken,
  ],
  (payToken, receiveToken): SwapChartToken | undefined => {
    const chartToken = isUsdcToken(receiveToken) ? payToken : receiveToken;
    const tokenSymbol = getSwapTokenSymbol(chartToken);

    if (!chartToken?.tokenAddress && !tokenSymbol) {
      return undefined;
    }

    return {
      tokenAddress: chartToken?.tokenAddress,
      tokenSymbol: tokenSymbol ? getNormalizedTokenSymbol(tokenSymbol) : undefined,
      tokenType: getSwapTokenType(chartToken),
    };
  }
);
