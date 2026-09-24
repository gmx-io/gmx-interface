import { TokensData } from '@/selectors/token/types';
import { Token } from '@/selectors/token/types';

export function isGlvToken(
  token: Token,
  glvTokensData: TokensData | undefined
): boolean {
  if (!glvTokensData || !token) {
    return false;
  }

  return token.address.toBase58() in glvTokensData;
}
