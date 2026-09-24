import { Token } from '@/selectors/token/types';

export function getGlvIndexName({
  glvToken,
  isSpotOnly,
}: {
  glvToken: Token;
  isSpotOnly?: boolean;
}) {
  if (isSpotOnly) {
    return `SWAP-ONLY`;
  }

  return `${glvToken.symbol}/USD`;
}
