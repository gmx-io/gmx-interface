import { ethers } from "ethers";

import { BOTANIX, ContractsChainId, getExplorerUrl } from "config/chains";
import { USD_DECIMALS } from "config/factors";
import { convertToTokenAmount } from "domain/synthetics/tokens/utils";
import { expandDecimals, PRECISION } from "lib/numbers";
import { InfoTokens } from "sdk/types/tokens";

export * from "sdk/utils/tokens";

const { ZeroAddress } = ethers;

export function getTokenUrl(chainId: number, address: string) {
  if (!address) {
    return getExplorerUrl(chainId);
  }
  return getExplorerUrl(chainId) + "token/" + address;
}

export function getTokenInfo(
  infoTokens: InfoTokens,
  tokenAddress: string,
  replaceNative?: boolean,
  nativeTokenAddress?: string
) {
  if (replaceNative && tokenAddress === nativeTokenAddress) {
    return infoTokens[ZeroAddress];
  }

  return infoTokens[tokenAddress];
}

export function getSpread(p: { minPrice: bigint; maxPrice: bigint }): bigint {
  const diff = p.maxPrice - p.minPrice;
  return (diff * PRECISION) / ((p.maxPrice + p.minPrice) / 2n);
}

const MIN_NATIVE_CURRENCY_FOR_GAS = expandDecimals(10, USD_DECIMALS);
const MIN_NATIVE_CURRENCY_FOR_GAS_BOTANIX = expandDecimals(15, USD_DECIMALS);
// calculates the minimum amount of native currency that should be left to be used as gas fees
export function getMinResidualAmount({
  chainId,
  decimals,
  price,
}: {
  chainId: ContractsChainId;
  decimals: number | undefined;
  price: bigint | undefined;
}) {
  if (!decimals || price === undefined) {
    return 0n;
  }

  let minResidualAmountUsd = MIN_NATIVE_CURRENCY_FOR_GAS;
  if (chainId === BOTANIX) {
    minResidualAmountUsd = MIN_NATIVE_CURRENCY_FOR_GAS_BOTANIX;
  }

  return convertToTokenAmount(minResidualAmountUsd, decimals, price);
}

const BLACKLISTED_REGEX = /Wrapped|\(Wormhole\)|\(LayerZero\)/gim;
export function stripBlacklistedWords(name: string): string {
  return name.replace(BLACKLISTED_REGEX, "").trim();
}
