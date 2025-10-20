import { GlobalExpressParams } from "../../express";
import {
  ExecutionFee,
  estimateExecuteGlvWithdrawalGasLimit,
  getExecutionFee,
  estimateGlvWithdrawalOraclePriceCount,
} from "../../fees";
import { RawCreateGlvWithdrawalParams } from "../types";

export function estimatePureGlvWithdrawalGasLimit({
  params,
  chainId,
  globalExpressParams,
  marketsCount,
}: {
  params: RawCreateGlvWithdrawalParams;
  chainId: number;
  globalExpressParams: GlobalExpressParams;
  marketsCount: bigint;
}): ExecutionFee {
  const swapPathCount = BigInt(params.addresses.longTokenSwapPath.length + params.addresses.shortTokenSwapPath.length);

  const gasLimitPureGlvWithdrawal = estimateExecuteGlvWithdrawalGasLimit(globalExpressParams.gasLimits, {
    marketsCount,
    swapsCount: swapPathCount,
  });

  const oraclePriceCount = estimateGlvWithdrawalOraclePriceCount(marketsCount, swapPathCount);

  const executionFee = getExecutionFee(
    chainId,
    globalExpressParams.gasLimits,
    globalExpressParams.tokensData,
    gasLimitPureGlvWithdrawal,
    globalExpressParams.gasPrice,
    oraclePriceCount
  );

  if (executionFee === undefined) {
    throw new Error("Execution fee not found");
  }

  return executionFee;
}
