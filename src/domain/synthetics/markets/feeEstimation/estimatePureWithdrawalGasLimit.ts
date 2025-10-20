import { GlobalExpressParams } from "../../express";
import {
  ExecutionFee,
  estimateExecuteWithdrawalGasLimit,
  estimateWithdrawalOraclePriceCount,
  getExecutionFee,
} from "../../fees";
import { RawCreateWithdrawalParams } from "../types";

export function estimatePureWithdrawalGasLimit({
  params,
  chainId,
  globalExpressParams,
}: {
  params: RawCreateWithdrawalParams;
  chainId: number;
  globalExpressParams: GlobalExpressParams;
}): ExecutionFee {
  const swapPathCount = BigInt(params.addresses.longTokenSwapPath.length + params.addresses.shortTokenSwapPath.length);

  const gasLimitPureWithdrawal = estimateExecuteWithdrawalGasLimit(globalExpressParams.gasLimits, {
    swapsCount: swapPathCount,
  });

  const oraclePriceCount = estimateWithdrawalOraclePriceCount(swapPathCount);

  const executionFee = getExecutionFee(
    chainId,
    globalExpressParams.gasLimits,
    globalExpressParams.tokensData,
    gasLimitPureWithdrawal,
    globalExpressParams.gasPrice,
    oraclePriceCount
  );

  if (executionFee === undefined) {
    throw new Error("Execution fee not found");
  }

  return executionFee;
}
