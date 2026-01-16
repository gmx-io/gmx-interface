import { getMappedTokenId } from "config/multichain";
import { getTokenAddressByGlv, isGlvAddress } from "domain/synthetics/markets/glv";
import type { SettlementChainId, SourceChainId } from "sdk/configs/chains";
import { getTokenAddressByMarket } from "sdk/configs/markets";
import { convertTokenAddress } from "sdk/configs/tokens";

export function getAreBothCollateralsCrossChain({
  chainId,
  srcChainId,
  glvOrMarketAddress,
}: {
  chainId: number;
  srcChainId: SourceChainId | undefined;
  glvOrMarketAddress: string | undefined;
}): boolean {
  if (!glvOrMarketAddress || !srcChainId) {
    return true;
  }

  const longTokenAddress = isGlvAddress(chainId, glvOrMarketAddress)
    ? getTokenAddressByGlv(chainId, glvOrMarketAddress, "long")
    : getTokenAddressByMarket(chainId, glvOrMarketAddress, "long");
  const shortTokenAddress = isGlvAddress(chainId, glvOrMarketAddress)
    ? getTokenAddressByGlv(chainId, glvOrMarketAddress, "short")
    : getTokenAddressByMarket(chainId, glvOrMarketAddress, "short");

  const unwrappedLongTokenAddress = convertTokenAddress(chainId, longTokenAddress, "native");
  const unwrappedShortTokenAddress = convertTokenAddress(chainId, shortTokenAddress, "native");

  const mappedLongTokenId = getMappedTokenId(chainId as SettlementChainId, unwrappedLongTokenAddress, srcChainId);
  const mappedShortTokenId = getMappedTokenId(chainId as SettlementChainId, unwrappedShortTokenAddress, srcChainId);

  const isLongTokenCrossChain = mappedLongTokenId !== undefined;
  const isShortTokenCrossChain = mappedShortTokenId !== undefined;

  return isLongTokenCrossChain && isShortTokenCrossChain;
}
