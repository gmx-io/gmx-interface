import { t } from "@lingui/macro";
import { useMemo } from "react";

import { ContractsChainId, SourceChainId } from "config/chains";
import { selectAccount } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useUsdToNativeTokenMultichain } from "domain/multichain/useMultichainQuoteFeeUsd";
import { useNativeTokenBalance } from "domain/multichain/useNativeTokenBalance";
import { ValidationBannerErrorName, ValidationResult } from "domain/synthetics/trade/utils/validation";

export function useSourceChainNativeFeeError({
  networkFeeUsd,
  paySource,
  chainId,
  srcChainId,
  paySourceChainNativeTokenAmount = 0n,
}: {
  networkFeeUsd: bigint | undefined;
  paySource?: "sourceChain" | string;
  chainId: ContractsChainId | undefined;
  srcChainId: SourceChainId | undefined;
  paySourceChainNativeTokenAmount: bigint | undefined;
}): ValidationResult | undefined {
  const account = useSelector(selectAccount);
  const sourceChainNativeTokenBalance = useNativeTokenBalance(srcChainId, account);
  const nativeFee = useUsdToNativeTokenMultichain({
    sourceChainId: srcChainId,
    usd: networkFeeUsd,
    targetChainId: chainId,
  });

  return useMemo((): ValidationResult | undefined => {
    if (
      (paySource !== undefined && paySource !== "sourceChain") ||
      chainId === undefined ||
      srcChainId === undefined ||
      nativeFee === undefined ||
      sourceChainNativeTokenBalance === undefined
    ) {
      return undefined;
    }

    const requiredAmount = nativeFee + paySourceChainNativeTokenAmount;

    if (sourceChainNativeTokenBalance < requiredAmount) {
      return {
        buttonErrorMessage: t`Insufficient gas balance`,
        bannerErrorName: ValidationBannerErrorName.insufficientSourceChainNativeTokenBalance,
      };
    }

    return undefined;
  }, [paySource, chainId, srcChainId, nativeFee, sourceChainNativeTokenBalance, paySourceChainNativeTokenAmount]);
}
