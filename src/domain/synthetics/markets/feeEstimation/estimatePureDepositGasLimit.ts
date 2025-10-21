import { GlobalExpressParams } from "../../express";
import {
  ExecutionFee,
  estimateExecuteDepositGasLimit,
  estimateDepositOraclePriceCount,
  getExecutionFee,
} from "../../fees";
import { RawCreateDepositParams } from "../types";

export function estimatePureDepositGasLimit({
  params,
  chainId,
  globalExpressParams,
}: {
  params: RawCreateDepositParams;
  chainId: number;
  globalExpressParams: GlobalExpressParams;
}): ExecutionFee {
  const swapPathCount = BigInt(params.addresses.longTokenSwapPath.length + params.addresses.shortTokenSwapPath.length);

  const gasLimitPureDeposit = estimateExecuteDepositGasLimit(globalExpressParams.gasLimits, {
    swapsCount: swapPathCount,
  });

  const oraclePriceCount = estimateDepositOraclePriceCount(swapPathCount);

  const executionFee = getExecutionFee(
    chainId,
    globalExpressParams.gasLimits,
    globalExpressParams.tokensData,
    gasLimitPureDeposit,
    globalExpressParams.gasPrice,
    oraclePriceCount
  );

  if (executionFee === undefined) {
    throw new Error("Execution fee not found");
  }

  return executionFee;
}
