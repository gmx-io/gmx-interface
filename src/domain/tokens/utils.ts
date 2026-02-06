import { BOTANIX, ContractsChainId } from "config/chains";
import { USD_DECIMALS } from "config/factors";
import type { TokenData } from "domain/synthetics/tokens";
import { convertToTokenAmount } from "domain/synthetics/tokens";
import { expandDecimals, PRECISION } from "lib/numbers";
import { convertToUsd, getMidPrice } from "sdk/utils/tokens";

export * from "sdk/utils/tokens";

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

export function sortTokenDataByBalance(a: TokenData, b: TokenData): 1 | -1 | 0 {
  const aBalanceUsd =
    a.prices && a.gmxAccountBalance !== undefined
      ? convertToUsd(a.gmxAccountBalance, a.decimals, getMidPrice(a.prices)) ?? 0n
      : 0n;
  const bBalanceUsd =
    b.prices && b.gmxAccountBalance !== undefined
      ? convertToUsd(b.gmxAccountBalance, b.decimals, getMidPrice(b.prices)) ?? 0n
      : 0n;

  if (aBalanceUsd === bBalanceUsd) {
    return 0;
  }

  return bBalanceUsd > aBalanceUsd ? 1 : -1;
}
