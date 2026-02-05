import { getSourceChainDecimalsMapped } from "config/multichain";
import { MAX_METAMASK_MOBILE_DECIMALS } from "config/ui";
import { GasPaymentTokenMaxAvailabilityStatus } from "domain/synthetics/fees/getMaxAvailableTokenAmount";
import { TokenData } from "domain/synthetics/tokens";
import { getBalanceByBalanceType } from "domain/synthetics/tokens/utils";
import { TokenBalanceType } from "domain/tokens";
import { useChainId } from "lib/chains";
import { absDiffBps, formatAmountFree, formatBalanceAmount } from "lib/numbers";
import useIsMetamaskMobile from "lib/wallets/useIsMetamaskMobile";
import { SourceChainId } from "sdk/configs/chains";

import { getLowGasPaymentTokenBalanceWarning } from "components/Errors/LowGasPaymentTokenBalanceWarning";

export function useMaxAvailableAmount({
  fromToken,
  fromTokenAmount,
  fromTokenInputValue,
  maxAvailableAmount = 0n,
  isLoading,
  tokenBalanceType = TokenBalanceType.Wallet,
  overrideBalance = false,
  balance,
  srcChainId,
  maxAvailableAmountStatus,
  gasPaymentTokenSymbol,
}: {
  fromToken: TokenData | undefined;
  fromTokenAmount: bigint;
  fromTokenInputValue: string;
  maxAvailableAmount?: bigint;
  isLoading: boolean;
  srcChainId?: SourceChainId;
  maxAvailableAmountStatus?: GasPaymentTokenMaxAvailabilityStatus;
  gasPaymentTokenSymbol?: string;
} & (
  | { tokenBalanceType?: TokenBalanceType; balance?: undefined; overrideBalance?: false }
  | { overrideBalance: true; balance: bigint | undefined; tokenBalanceType?: undefined }
)): {
  formattedBalance: string;
  formattedMaxAvailableAmount: string;
  showClickMax: boolean;
  gasPaymentTokenWarningContent: string | undefined;
} {
  const { chainId } = useChainId();
  const isMetamaskMobile = useIsMetamaskMobile();

  const fromTokenBalance = fromToken
    ? overrideBalance
      ? balance
      : getBalanceByBalanceType(fromToken, tokenBalanceType)
    : undefined;

  if (fromToken === undefined || fromTokenBalance === undefined) {
    return {
      formattedBalance: "",
      formattedMaxAvailableAmount: "",
      showClickMax: false,
      gasPaymentTokenWarningContent: undefined,
    };
  }

  const decimals =
    srcChainId && tokenBalanceType === TokenBalanceType.SourceChain
      ? getSourceChainDecimalsMapped(chainId, srcChainId, fromToken.address) ?? fromToken.decimals
      : fromToken.decimals;

  const formattedBalance = formatBalanceAmount(fromTokenBalance, decimals, undefined, {
    isStable: fromToken.isStable,
  });

  const gasPaymentTokenWarningContent =
    maxAvailableAmountStatus !== undefined && gasPaymentTokenSymbol !== undefined && fromTokenAmount > 0n
      ? getLowGasPaymentTokenBalanceWarning({
          chainId,
          status: maxAvailableAmountStatus,
          symbol: gasPaymentTokenSymbol,
        })
      : undefined;

  if (isLoading) {
    return {
      formattedBalance,
      formattedMaxAvailableAmount: "",
      showClickMax: false,
      gasPaymentTokenWarningContent,
    };
  }

  const formattedMaxAvailableAmount = formatAmountFree(
    maxAvailableAmount,
    decimals,
    isMetamaskMobile ? MAX_METAMASK_MOBILE_DECIMALS : undefined
  );

  const isFromTokenInputValueNearMax = absDiffBps(fromTokenAmount, maxAvailableAmount) < 100n; /* 1% */

  const showClickMax = fromToken.isNative
    ? !isFromTokenInputValueNearMax
    : fromTokenInputValue !== formattedMaxAvailableAmount && maxAvailableAmount > 0n;

  return {
    formattedBalance,
    formattedMaxAvailableAmount,
    showClickMax,
    gasPaymentTokenWarningContent,
  };
}
