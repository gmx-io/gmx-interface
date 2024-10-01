import { getWhitelistedV1Tokens } from "config/tokens";

export function getWhitelistedTokenAddresses(chainId) {
  const whitelistedTokens = getWhitelistedV1Tokens(chainId);
  return whitelistedTokens.map((token) => token.address);
}
