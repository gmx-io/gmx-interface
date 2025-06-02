import { MAX_METAMASK_MOBILE_DECIMALS } from "config/ui";
import { TokenData } from "domain/synthetics/tokens";
import { getMinResidualAmount } from "domain/tokens";
import { absDiffBps, formatAmountFree } from "lib/numbers";
import useIsMetamaskMobile from "lib/wallets/useIsMetamaskMobile";

export function useMaxAvailableAmount({
  fromToken,
  nativeToken,
  fromTokenAmount,
  fromTokenInputValue,
  minResidualAmount,
  isLoading,
}: {
  fromToken: TokenData | undefined;
  nativeToken: TokenData | undefined;
  fromTokenAmount: bigint;
  fromTokenInputValue: string;
  minResidualAmount?: bigint;
  isLoading: boolean;
}): {
  formattedMaxAvailableAmount: string;
  showClickMax: boolean;
} {
  const isMetamaskMobile = useIsMetamaskMobile();

  if (fromToken === undefined || fromToken.balance === undefined || fromToken.balance === 0n || isLoading) {
    return { formattedMaxAvailableAmount: "", showClickMax: false };
  }

  const minNativeTokenBalance = getMinResidualAmount(nativeToken?.decimals, nativeToken?.prices.maxPrice) ?? 0n;
  const minResidualBalance = (fromToken.isNative ? minNativeTokenBalance : 0n) + (minResidualAmount ?? 0n);

  let maxAvailableAmount = fromToken.balance - minResidualBalance;

  if (maxAvailableAmount < 0) {
    maxAvailableAmount = 0n;
  }

  const formattedMaxAvailableAmount = formatAmountFree(
    maxAvailableAmount,
    fromToken.decimals,
    isMetamaskMobile ? MAX_METAMASK_MOBILE_DECIMALS : undefined
  );

  const isFromTokenInputValueNearMax = absDiffBps(fromTokenAmount, maxAvailableAmount) < 100n; /* 1% */

  const showClickMax = fromToken.isNative
    ? !isFromTokenInputValueNearMax
    : fromTokenInputValue !== formattedMaxAvailableAmount && maxAvailableAmount > 0n;

  return { formattedMaxAvailableAmount, showClickMax };
}
