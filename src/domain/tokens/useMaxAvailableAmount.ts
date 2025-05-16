import { MAX_METAMASK_MOBILE_DECIMALS } from "config/ui";
import { RelayerFeeParams } from "domain/synthetics/express";
import { TokenData } from "domain/synthetics/tokens";
import { getMinResidualAmount } from "domain/tokens";
import { absDiffBps, formatAmountFree } from "lib/numbers";
import useIsMetamaskMobile from "lib/wallets/useIsMetamaskMobile";

export function useMaxAvailableAmount({
  fromToken,
  nativeToken,
  fromTokenAmount,
  fromTokenInputValue,
  relayerFeeParams,
}: {
  fromToken: TokenData | undefined;
  nativeToken: TokenData | undefined;
  fromTokenAmount: bigint;
  fromTokenInputValue: string;
  relayerFeeParams: RelayerFeeParams | undefined;
}): {
  formattedMaxAvailableAmount: string;
  showClickMax: boolean;
} {
  const isMetamaskMobile = useIsMetamaskMobile();

  if (fromToken === undefined || fromToken.balance === undefined || fromToken.balance === 0n) {
    return { formattedMaxAvailableAmount: "", showClickMax: false };
  }

  const minResidualAmount = getMinResidualAmount(nativeToken?.decimals, nativeToken?.prices.maxPrice);
  const gasPaymentAmount =
    relayerFeeParams?.gasPaymentTokenAddress === fromToken.address ? relayerFeeParams.gasPaymentTokenAmount : 0n;

  let maxAvailableAmount = fromToken.isNative
    ? fromToken.balance - BigInt(minResidualAmount ?? 0n) - gasPaymentAmount
    : fromToken.balance - gasPaymentAmount;

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
    : fromTokenInputValue !== formattedMaxAvailableAmount;

  return { formattedMaxAvailableAmount, showClickMax };
}
