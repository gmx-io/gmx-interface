import { getGlvNewNameEnabled } from '@/config/featureFlagEnable';
import { GlvInfo } from '@/selectors/glv/types';
import {
  GLV_COMMODITY_TOKEN,
  GLV_CRYPTO_TOKENS,
  GLV_FOREX_TOKEN,
  GLV_STOCK_TOKEN,
} from '@/utils/glv/glvTokens';

export function isGlvCryptoVault(glvTokenAddress?: string | null): boolean {
  if (!glvTokenAddress) return false;
  if (!getGlvNewNameEnabled()) return false;
  return GLV_CRYPTO_TOKENS.has(glvTokenAddress);
}

export function getGlvDisplayNameByTokenAddress(
  glvTokenAddress?: string | null,
  fallback = 'GLV'
): string {
  if (glvTokenAddress === GLV_STOCK_TOKEN) return 'GLV(Stock)';
  if (glvTokenAddress === GLV_COMMODITY_TOKEN) return 'GLV(Commodity)';
  if (glvTokenAddress === GLV_FOREX_TOKEN) return 'GLV(Forex)';
  if (isGlvCryptoVault(glvTokenAddress)) return 'GLV(Crypto)';
  return fallback;
}

export function getGlvDisplayName(glv: GlvInfo): string {
  return getGlvDisplayNameByTokenAddress(
    glv.glvTokenAddress?.toString(),
    glv.glvToken.symbol
  );
}
