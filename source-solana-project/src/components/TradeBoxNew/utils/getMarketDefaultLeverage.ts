import { GMX_SOLANA_TOKENS_RAW } from '@/config/program'

const SPECIAL_MARKET_DEFAULT_LEVERAGE: Record<string, string> = {
  SPCX: '5',
}

export const getMarketDefaultLeverage = (indexToken?: string) => {
  const symbol = GMX_SOLANA_TOKENS_RAW[indexToken || '']?.symbol

  return (symbol && SPECIAL_MARKET_DEFAULT_LEVERAGE[symbol]) || '10'
}
