import { getWhitelistedV1Tokens } from "sdk/configs/tokens";

export function getWhitelistedTokenAddresses(chainId) {
  const whitelistedTokens = getWhitelistedV1Tokens(chainId);
  return whitelistedTokens.map((token) => token.address);
}
