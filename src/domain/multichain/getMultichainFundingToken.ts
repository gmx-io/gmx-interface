import { getTokenAddressByGlv, isGlvAddress } from "domain/synthetics/markets/glv";
import { getGlvMarketName } from "domain/synthetics/markets/utils";
import {
  getIsSpotOnlyMarket,
  getMarketIndexToken,
  getTokenAddressByMarket,
  isMarketTokenAddress,
} from "sdk/configs/markets";
import { getNormalizedTokenSymbol, getToken, isValidTokenSafe } from "sdk/configs/tokens";
import { getMarketIndexName, getMarketPoolName } from "sdk/utils/markets";

export type MultichainFundingToken = {
  symbol: string;
  name: string;
  poolName: string | undefined;
  iconSymbol: string;
  decimals: number;
  isStable: boolean | undefined;
  isPlatformToken: boolean;
};

export function getMultichainFundingTokenLabel(token: MultichainFundingToken): string {
  return token.poolName ? `${token.name} [${token.poolName}]` : token.name;
}

export function getMultichainFundingToken(chainId: number, address: string): MultichainFundingToken | undefined {
  if (isGlvAddress(chainId, address)) {
    const glvName = getGlvMarketName(chainId, address);

    return {
      symbol: "GLV",
      name: glvName !== undefined ? `GLV: ${glvName}` : "GLV",
      poolName: getMarketPoolName({
        longToken: getToken(chainId, getTokenAddressByGlv(chainId, address, "long")),
        shortToken: getToken(chainId, getTokenAddressByGlv(chainId, address, "short")),
      }),
      iconSymbol: "GLV",
      decimals: 18,
      isStable: false,
      isPlatformToken: true,
    };
  }

  if (isMarketTokenAddress(chainId, address)) {
    const isSpotOnly = getIsSpotOnlyMarket(chainId, address);
    const indexToken = getMarketIndexToken(chainId, address);
    const longToken = getToken(chainId, getTokenAddressByMarket(chainId, address, "long"));
    const shortToken = getToken(chainId, getTokenAddressByMarket(chainId, address, "short"));

    return {
      symbol: "GM",
      name: `GM: ${getMarketIndexName({ indexToken, isSpotOnly })}`,
      poolName: getMarketPoolName({ longToken, shortToken }),
      iconSymbol: isSpotOnly
        ? getNormalizedTokenSymbol(longToken.symbol) + getNormalizedTokenSymbol(shortToken.symbol)
        : indexToken.symbol,
      decimals: 18,
      isStable: false,
      isPlatformToken: true,
    };
  }

  if (!isValidTokenSafe(chainId, address)) {
    return undefined;
  }

  const token = getToken(chainId, address);

  return {
    symbol: token.symbol,
    name: token.symbol,
    poolName: undefined,
    iconSymbol: token.symbol,
    decimals: token.decimals,
    isStable: token.isStable,
    isPlatformToken: false,
  };
}
