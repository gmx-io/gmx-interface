import { MARKETS } from "sdk/configs/markets";
import { createSelector } from "../utils";
import { selectChainId, selectTokensData, selectWalletChainId } from "./globalSelectors";
import { convertTokenAddress } from "sdk/configs/tokens";
import { EMPTY_OBJECT, getByKey } from "lib/objects";
import { isSettlementChain } from "context/GmxAccountContext/config";

const LONG_SHORT_TOKENS_MAP: Record<number, string[]> = {};

for (const chainId in MARKETS) {
  const set = new Set<string>();
  for (const marketAddress in MARKETS[chainId]) {
    const marketConfig = MARKETS[chainId][marketAddress];
    set.add(marketConfig.longTokenAddress);
    set.add(marketConfig.shortTokenAddress);

    const longTokenWrappedAddress = convertTokenAddress(Number(chainId), marketConfig.longTokenAddress, "wrapped");
    const shortTokenWrappedAddress = convertTokenAddress(Number(chainId), marketConfig.shortTokenAddress, "wrapped");

    set.add(longTokenWrappedAddress);
    set.add(shortTokenWrappedAddress);
  }
  LONG_SHORT_TOKENS_MAP[chainId] = Array.from(set);
}

// Select tokensdata with only tokens that are possible to pay with
// meaning the token is either long or short part of any market
export const selectWalletPayableTokensData = createSelector((q) => {
  const chainId = q(selectWalletChainId);

  if (!chainId || !isSettlementChain(chainId)) {
    return EMPTY_OBJECT;
  }

  const longShortTokens = LONG_SHORT_TOKENS_MAP[chainId];

  const tokensData = {};

  for (const tokenAddress of longShortTokens) {
    const tokenData = q((state) => getByKey(selectTokensData(state), tokenAddress));

    if (tokenData) {
      tokensData[tokenAddress] = tokenData;
    }
  }

  return tokensData;
});
