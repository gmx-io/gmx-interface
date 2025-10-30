import intersection from "lodash/intersection";

import { SettlementChainId, SourceChainId } from "config/chains";
import { MULTICHAIN_TOKEN_MAPPING } from "config/multichain";
import { EMPTY_OBJECT } from "lib/objects";
import { getGasPaymentTokens } from "sdk/configs/express";
import { convertTokenAddress, getToken } from "sdk/configs/tokens";

export function getMultichainTransferableGasPaymentTokenAddresses(
  chainId: SettlementChainId,
  srcChainId: SourceChainId
): string[] {
  const gasPaymentTokens = getGasPaymentTokens(chainId).map((tokenAddress) =>
    convertTokenAddress(chainId, tokenAddress, "native")
  );

  const multichainTokens = Object.values(MULTICHAIN_TOKEN_MAPPING[chainId]?.[srcChainId] || EMPTY_OBJECT).map(
    (token) => token.settlementChainTokenAddress
  );

  return intersection(gasPaymentTokens, multichainTokens);
}

export function getMultichainTransferableGasPaymentTokenSymbols(chainId: SettlementChainId, srcChainId: SourceChainId) {
  return getMultichainTransferableGasPaymentTokenAddresses(chainId, srcChainId).map(
    (tokenAddress) => getToken(chainId, tokenAddress).symbol
  );
}
