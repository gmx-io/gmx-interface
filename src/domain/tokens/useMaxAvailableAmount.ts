import { MAX_METAMASK_MOBILE_DECIMALS } from "config/ui";
import { TokenData } from "domain/synthetics/tokens";
import { getBalanceByBalanceType, getSourceChainDecimals } from "domain/synthetics/tokens/utils";
import { getMinResidualAmount, TokenBalanceType } from "domain/tokens";
import { useChainId } from "lib/chains";
import { absDiffBps, formatAmountFree, formatBalanceAmount } from "lib/numbers";
import useIsMetamaskMobile from "lib/wallets/useIsMetamaskMobile";
import { SourceChainId } from "sdk/configs/chains";

export function useMaxAvailableAmount({
  fromToken,
  nativeToken,
  fromTokenAmount,
  fromTokenInputValue,
  minResidualAmount,
  isLoading,
  tokenBalanceType = TokenBalanceType.Wallet,
  srcChainId,
}: {
  fromToken: TokenData | undefined;
  nativeToken: TokenData | undefined;
  fromTokenAmount: bigint;
  fromTokenInputValue: string;
  minResidualAmount?: bigint;
  isLoading: boolean;
  tokenBalanceType?: TokenBalanceType;
  srcChainId?: SourceChainId;
}): {
  formattedBalance: string;
  formattedMaxAvailableAmount: string;
  showClickMax: boolean;
} {
  const { chainId } = useChainId();
  const isMetamaskMobile = useIsMetamaskMobile();

  const fromTokenBalance = fromToken ? getBalanceByBalanceType(fromToken, tokenBalanceType) : undefined;

  if (fromToken === undefined || fromTokenBalance === undefined || fromTokenBalance === 0n || isLoading) {
    return { formattedBalance: "", formattedMaxAvailableAmount: "", showClickMax: false };
  }

  const minNativeTokenBalance =
    getMinResidualAmount({ chainId, decimals: nativeToken?.decimals, price: nativeToken?.prices.maxPrice }) ?? 0n;
  const minResidualBalance = (fromToken.isNative ? minNativeTokenBalance : 0n) + (minResidualAmount ?? 0n);

  let maxAvailableAmount = fromTokenBalance - minResidualBalance;

  if (maxAvailableAmount < 0) {
    maxAvailableAmount = 0n;
  }

  const formattedMaxAvailableAmount = formatAmountFree(
    maxAvailableAmount,
    fromToken.decimals,
    isMetamaskMobile ? MAX_METAMASK_MOBILE_DECIMALS : undefined
  );

  const formattedBalance =
    srcChainId && tokenBalanceType === TokenBalanceType.SourceChain
      ? formatBalanceAmount(
          fromTokenBalance,
          getSourceChainDecimals(chainId, srcChainId, fromToken.address) ?? fromToken.decimals,
          undefined,
          {
            isStable: fromToken.isStable,
          }
        )
      : formatBalanceAmount(fromTokenBalance, fromToken.decimals, undefined, {
          isStable: fromToken.isStable,
        });

  const isFromTokenInputValueNearMax = absDiffBps(fromTokenAmount, maxAvailableAmount) < 100n; /* 1% */

  const showClickMax = fromToken.isNative
    ? !isFromTokenInputValueNearMax
    : fromTokenInputValue !== formattedMaxAvailableAmount && maxAvailableAmount > 0n;

  return { formattedBalance, formattedMaxAvailableAmount, showClickMax };
}
