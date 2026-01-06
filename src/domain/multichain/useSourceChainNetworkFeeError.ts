import { t } from "@lingui/macro";
import { useMemo } from "react";

import { ContractsChainId, getViemChain, SourceChainId } from "config/chains";
import { selectAccount } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useUsdToNativeTokenMultichain } from "domain/multichain/useMultichainQuoteFeeUsd";
import { useNativeTokenBalance } from "domain/multichain/useNativeTokenBalance";
import { adjustForDecimals, formatBalanceAmount } from "sdk/utils/numbers";

export type SourceChainNativeFeeError = {
  buttonText: string;
  warningText: string;
};

export function useSourceChainNativeFeeError({
  networkFeeUsd,
  paySource,
  chainId,
  srcChainId,
  payNativeTokenAmount = 0n,
}: {
  networkFeeUsd: bigint | undefined;
  paySource?: "sourceChain" | string;
  chainId: ContractsChainId | undefined;
  srcChainId: SourceChainId | undefined;
  payNativeTokenAmount: bigint | undefined;
}): SourceChainNativeFeeError | undefined {
  const account = useSelector(selectAccount);
  const sourceChainNativeTokenBalance = useNativeTokenBalance(srcChainId, account);
  const nativeFee = useUsdToNativeTokenMultichain({
    sourceChainId: srcChainId,
    usd: networkFeeUsd,
    targetChainId: chainId,
  });

  return useMemo(() => {
    if (
      (paySource !== undefined && paySource !== "sourceChain") ||
      chainId === undefined ||
      srcChainId === undefined ||
      nativeFee === undefined ||
      sourceChainNativeTokenBalance === undefined
    ) {
      return undefined;
    }

    const settlementChainNativeCurrency = getViemChain(chainId).nativeCurrency;
    const sourceChainNativeCurrency = getViemChain(srcChainId).nativeCurrency;
    const symbol = sourceChainNativeCurrency.symbol;
    const decimals = sourceChainNativeCurrency.decimals;

    const payNativeTokenAmountInSourceDecimals = adjustForDecimals(
      payNativeTokenAmount,
      settlementChainNativeCurrency.decimals,
      sourceChainNativeCurrency.decimals
    );

    const requiredAmount = nativeFee + payNativeTokenAmountInSourceDecimals;

    if (sourceChainNativeTokenBalance < requiredAmount) {
      const availableFormatted = formatBalanceAmount(sourceChainNativeTokenBalance, decimals);
      const requiredFormatted = formatBalanceAmount(requiredAmount, decimals);

      return {
        buttonText: t`Insufficient ${symbol} balance`,
        warningText: t`Insufficient ${symbol} balance: ${availableFormatted} available, ${requiredFormatted} required`,
      };
    }

    return undefined;
  }, [paySource, chainId, srcChainId, nativeFee, sourceChainNativeTokenBalance, payNativeTokenAmount]);
}
