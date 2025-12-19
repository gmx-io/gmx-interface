import { getSourceChainDecimalsMapped } from "config/multichain";
import { MAX_METAMASK_MOBILE_DECIMALS } from "config/ui";
import { TokenData } from "domain/synthetics/tokens";
import { getBalanceByBalanceType } from "domain/synthetics/tokens/utils";
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
  overrideBalance = false,
  balance,
  srcChainId,
}: {
  fromToken: TokenData | undefined;
  nativeToken: TokenData | undefined;
  fromTokenAmount: bigint;
  fromTokenInputValue: string;
  minResidualAmount?: bigint;
  isLoading: boolean;
  srcChainId?: SourceChainId;
} & (
  | { tokenBalanceType?: TokenBalanceType; balance?: undefined; overrideBalance?: false }
  | { overrideBalance: true; balance: bigint | undefined; tokenBalanceType?: undefined }
)): {
  formattedBalance: string;
  formattedMaxAvailableAmount: string;
  showClickMax: boolean;
} {
  const { chainId } = useChainId();
  const isMetamaskMobile = useIsMetamaskMobile();

  const fromTokenBalance = fromToken
    ? overrideBalance
      ? balance
      : getBalanceByBalanceType(fromToken, tokenBalanceType)
    : undefined;

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

  const decimals =
    srcChainId && tokenBalanceType === TokenBalanceType.SourceChain
      ? getSourceChainDecimalsMapped(chainId, srcChainId, fromToken.address) ?? fromToken.decimals
      : fromToken.decimals;
  const formattedMaxAvailableAmount = formatAmountFree(
    maxAvailableAmount,
    decimals,
    isMetamaskMobile ? MAX_METAMASK_MOBILE_DECIMALS : undefined
  );

  const formattedBalance =
    srcChainId && tokenBalanceType === TokenBalanceType.SourceChain
      ? formatBalanceAmount(
          fromTokenBalance,
          getSourceChainDecimalsMapped(chainId, srcChainId, fromToken.address) ?? fromToken.decimals,
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
