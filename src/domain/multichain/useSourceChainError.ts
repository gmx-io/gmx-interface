import { t } from "@lingui/macro";
import { useMemo } from "react";

import { ContractsChainId, getChainName, getViemChain, SourceChainId } from "config/chains";
import { selectAccount } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useNativeTokenMultichainUsd } from "domain/multichain/useMultichainQuoteFeeUsd";
import { useNativeTokenBalance } from "domain/multichain/useNativeTokenBalance";

export function useSourceChainError({
  networkFeeUsd,
  paySource,
  chainId,
  srcChainId,
}: {
  networkFeeUsd: bigint | undefined;
  paySource?: "sourceChain" | string;
  chainId: ContractsChainId | undefined;
  srcChainId: SourceChainId | undefined;
}): string | undefined {
  const account = useSelector(selectAccount);
  const sourceChainNativeTokenBalance = useNativeTokenBalance(srcChainId, account);
  const sourceChainNativeTokenBalanceUsd = useNativeTokenMultichainUsd({
    sourceChainId: srcChainId,
    sourceChainTokenAmount: sourceChainNativeTokenBalance,
    targetChainId: chainId,
  });

  return useMemo(() => {
    if (
      (paySource !== undefined && paySource !== "sourceChain") ||
      srcChainId === undefined ||
      networkFeeUsd === undefined ||
      sourceChainNativeTokenBalanceUsd === undefined
    ) {
      return undefined;
    }

    const symbol = getViemChain(srcChainId).nativeCurrency.symbol;

    if (sourceChainNativeTokenBalanceUsd < networkFeeUsd) {
      return t`${symbol} balance on ${getChainName(srcChainId)} chain is insufficient to cover network fee`;
    }

    return undefined;
  }, [paySource, srcChainId, networkFeeUsd, sourceChainNativeTokenBalanceUsd]);
}
