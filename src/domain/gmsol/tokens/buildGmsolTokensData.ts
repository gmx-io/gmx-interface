import { getGmsolToken, getGmsolTokenAddresses } from "config/gmsol/tokenLookup";
import type { TokenPricesData, TokensData } from "sdk/utils/tokens/types";

// Solana TokensData: the static token list with prices from GMX's oracle keeper, keyed by mint
// (native SOL by NATIVE_TOKEN_ADDRESS). Balances stay undefined until Solana wallet balances land,
// so the UI shows them as unknown, never as zero. A token without a price is left out, like on EVM.
export function buildGmsolTokensData(pricesData: TokenPricesData): TokensData {
  const tokensData: TokensData = {};
  for (const address of getGmsolTokenAddresses()) {
    const token = getGmsolToken(address);
    const prices = pricesData[address];

    if (!token || !prices) {
      continue;
    }

    tokensData[address] = { ...token, prices };
  }

  return tokensData;
}
