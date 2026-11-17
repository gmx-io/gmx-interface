import uniq from "lodash/uniq";

import type { AnyChainId, GmxAccountPseudoChainId, SettlementChainId, SourceChainId } from "config/chains";
import { getMappedTokenId } from "config/multichain";
import { convertTokenAddress } from "sdk/configs/tokens";

export function resolveSourceChainPayTokenAddress({
  chainId,
  srcChainId,
  firstTokenAddress,
  tokenOptions,
  collateralTokenAddresses,
}: {
  chainId: SettlementChainId;
  srcChainId: SourceChainId;
  firstTokenAddress: string | undefined;
  tokenOptions: { address: string; chainId: AnyChainId | GmxAccountPseudoChainId }[];
  collateralTokenAddresses: string[];
}): string | undefined {
  const sourceChainOptionAddresses = tokenOptions
    .filter((token) => token.chainId === srcChainId)
    .map((token) => token.address);

  const payableCollateralAddresses: string[] = uniq(
    collateralTokenAddresses.map((tokenAddress) => convertTokenAddress(chainId, tokenAddress, "native"))
  ).filter((tokenAddress) => getMappedTokenId(chainId, tokenAddress, srcChainId) !== undefined);

  if (
    firstTokenAddress !== undefined &&
    (sourceChainOptionAddresses.includes(firstTokenAddress) || payableCollateralAddresses.includes(firstTokenAddress))
  ) {
    return firstTokenAddress;
  }

  return sourceChainOptionAddresses[0] ?? payableCollateralAddresses[0];
}
