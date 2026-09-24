import {
  GMX_SOLANA_GLV_METAL_RWA_MARKET_TOKENS,
  GMX_SOLANA_TOKENS_RAW,
} from '@/config/program';
import {
  GLV_COMMODITY_TOKEN,
  GLV_FOREX_TOKEN,
  GLV_STOCK_TOKEN,
} from '@/utils/glv/glvTokens';

export type RwaMarketCategory = 'stock' | 'forex' | 'commodity';

export function getRwaMarketCategory(
  glvToken?: string,
  indexToken?: string
): RwaMarketCategory | null {
  if (glvToken === GLV_STOCK_TOKEN) return 'stock';
  if (glvToken === GLV_FOREX_TOKEN) return 'forex';
  if (glvToken === GLV_COMMODITY_TOKEN) return 'commodity';

  if (!indexToken) return null;

  const tokenConfig =
    GMX_SOLANA_TOKENS_RAW[indexToken as keyof typeof GMX_SOLANA_TOKENS_RAW];
  if (!tokenConfig) return null;

  if (tokenConfig.type === 'stock') return 'stock';
  if (tokenConfig.type === 'forex') return 'forex';

  const symbol = tokenConfig.symbol?.toLowerCase();
  if (symbol && GMX_SOLANA_GLV_METAL_RWA_MARKET_TOKENS.includes(symbol)) {
    return 'commodity';
  }

  return null;
}
