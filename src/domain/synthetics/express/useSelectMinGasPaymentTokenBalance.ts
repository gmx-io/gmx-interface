import { useMemo } from "react";

import { selectGasPaymentToken } from "context/SyntheticsStateContext/selectors/expressSelectors";
import {
  selectGasLimits,
  selectGasPrice,
  selectL1ExpressOrderGasReference,
  selectTokensData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useChainId } from "lib/chains";
import { getByKey } from "lib/objects";
import { getRelayerFeeToken } from "sdk/configs/express";
import { BatchOrderTxnParams, getBatchTotalExecutionFee } from "sdk/utils/orderTransactions";

import { estimateBatchMinGasPaymentTokenAmount } from "../fees";

export function useSelectMinGasPaymentTokenBalance({
  tokenAddress,
  batchParams,
}: {
  tokenAddress: string | undefined;
  batchParams: BatchOrderTxnParams | undefined;
}) {
  const { chainId } = useChainId();
  const tokensData = useSelector(selectTokensData);
  const gasPrice = useSelector(selectGasPrice);
  const gasLimits = useSelector(selectGasLimits);
  const l1Reference = useSelector(selectL1ExpressOrderGasReference);
  const gasPaymentToken = useSelector(selectGasPaymentToken);
  const relayFeeToken = getByKey(tokensData, getRelayerFeeToken(chainId).address);

  return useMemo(() => {
    if (!tokenAddress || tokenAddress !== gasPaymentToken?.address) {
      return 0n;
    }

    if (!gasLimits || gasPrice === undefined || !tokensData || !relayFeeToken) {
      return 0n;
    }

    const executionFee = batchParams ? getBatchTotalExecutionFee({ batchParams, tokensData, chainId }) : undefined;

    const minBalance = estimateBatchMinGasPaymentTokenAmount({
      gasLimits,
      gasPaymentToken,
      relayFeeToken,
      gasPrice,
      l1Reference,
      tokensData,
      chainId,
      executionFeeAmount: executionFee?.feeTokenAmount,
      createOrdersCount: batchParams?.createOrderParams.length ?? 1,
      updateOrdersCount: batchParams?.updateOrderParams.length ?? 0,
      cancelOrdersCount: batchParams?.cancelOrderParams.length ?? 0,
    });

    return minBalance;
  }, [
    tokenAddress,
    gasPaymentToken,
    gasLimits,
    gasPrice,
    l1Reference,
    tokensData,
    relayFeeToken,
    batchParams,
    chainId,
  ]);
}
