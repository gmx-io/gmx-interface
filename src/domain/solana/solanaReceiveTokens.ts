import { getByKey } from "lib/objects";
import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";
import type { TokenData, TokensData } from "sdk/utils/tokens/types";

/**
 * A Solana position has no swap route: an increase pays with the collateral, or native SOL when the collateral is
 * WSOL, and a close pays out the same. The EVM lists come from swap routes keyed by EVM chain id, which know no Solana mints.
 */
export function getIsSolanaCollateralToken(token: TokenData, collateralToken: TokenData) {
  return (
    token.address === collateralToken.address ||
    (token.isNative === true &&
      token.address === NATIVE_TOKEN_ADDRESS &&
      token.wrappedAddress === collateralToken.address)
  );
}

export function getSolanaReceiveTokens(collateralToken: TokenData | undefined, tokensData: TokensData | undefined) {
  if (!collateralToken) return [];

  const nativeToken = getByKey(tokensData, NATIVE_TOKEN_ADDRESS);

  return nativeToken && getIsSolanaCollateralToken(nativeToken, collateralToken)
    ? [nativeToken, collateralToken]
    : [collateralToken];
}
