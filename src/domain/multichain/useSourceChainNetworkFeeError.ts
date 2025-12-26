import { t } from "@lingui/macro";
import { useMemo } from "react";

import { ContractsChainId, getViemChain, SourceChainId } from "config/chains";
import { selectAccount } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useUsdToNativeTokenMultichain } from "domain/multichain/useMultichainQuoteFeeUsd";
import { useNativeTokenBalance } from "domain/multichain/useNativeTokenBalance";
import { formatBalanceAmount } from "sdk/utils/numbers";

export type SourceChainNativeFeeError = {
  buttonText: string;
  warningText: string;
};

export function useSourceChainNativeFeeError({
  networkFeeUsd,
  paySource,
  chainId,
  srcChainId,
}: {
  networkFeeUsd: bigint | undefined;
  paySource?: "sourceChain" | string;
  chainId: ContractsChainId | undefined;
  srcChainId: SourceChainId | undefined;
}): SourceChainNativeFeeError | undefined {
  const account = useSelector(selectAccount);
  const sourceChainNativeTokenBalance = useNativeTokenBalance(srcChainId, account);
  const nativeFee = useUsdToNativeTokenMultichain({
    sourceChainId: srcChainId,
    usdAmount: networkFeeUsd,
    targetChainId: chainId,
  });

  return useMemo(() => {
    if (
      (paySource !== undefined && paySource !== "sourceChain") ||
      srcChainId === undefined ||
      nativeFee === undefined ||
      sourceChainNativeTokenBalance === undefined
    ) {
      return undefined;
    }

    const nativeCurrency = getViemChain(srcChainId).nativeCurrency;
    const symbol = nativeCurrency.symbol;
    const decimals = nativeCurrency.decimals;

    if (sourceChainNativeTokenBalance < nativeFee) {
      const availableFormatted = formatBalanceAmount(sourceChainNativeTokenBalance, decimals);
      const requiredFormatted = formatBalanceAmount(nativeFee, decimals);

      return {
        buttonText: t`Insufficient ${symbol} balance`,
        warningText: t`Insufficient ${symbol} balance: ${availableFormatted} available, ${requiredFormatted} required`,
      };
    }

    return undefined;
  }, [paySource, srcChainId, nativeFee, sourceChainNativeTokenBalance]);
}
