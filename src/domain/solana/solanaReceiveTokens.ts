import { getByKey } from "lib/objects";
import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";
import type { TokenData, TokensData } from "sdk/utils/tokens/types";

/**
 * A Solana close pays out the collateral, or native SOL when the collateral is WSOL; there is no swap route.
 * The EVM receive list comes from swap routes keyed by EVM chain id, which know no Solana mints.
 */
export function getSolanaReceiveTokens(collateralToken: TokenData | undefined, tokensData: TokensData | undefined) {
  if (!collateralToken) return [];

  const nativeToken = getByKey(tokensData, NATIVE_TOKEN_ADDRESS);
  const receivesNative = nativeToken?.isNative === true && nativeToken.wrappedAddress === collateralToken.address;

  return receivesNative ? [nativeToken, collateralToken] : [collateralToken];
}
