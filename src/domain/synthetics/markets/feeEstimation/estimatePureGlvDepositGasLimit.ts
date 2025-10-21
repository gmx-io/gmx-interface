import { GlobalExpressParams } from "../../express";
import {
  ExecutionFee,
  estimateExecuteGlvDepositGasLimit,
  estimateGlvDepositOraclePriceCount,
  getExecutionFee,
} from "../../fees";
import { RawCreateGlvDepositParams } from "../types";

export function estimatePureGlvDepositGasLimit({
  params,
  chainId,
  globalExpressParams,
  marketsCount,
}: {
  params: RawCreateGlvDepositParams;
  chainId: number;
  globalExpressParams: GlobalExpressParams;
  marketsCount: bigint;
}): ExecutionFee {
  const swapPathCount = BigInt(params.addresses.longTokenSwapPath.length + params.addresses.shortTokenSwapPath.length);

  const gasLimitPureDeposit = estimateExecuteGlvDepositGasLimit(globalExpressParams.gasLimits, {
    swapsCount: swapPathCount,
    isMarketTokenDeposit: params.isMarketTokenDeposit,
    marketsCount,
  });

  const oraclePriceCount = estimateGlvDepositOraclePriceCount(marketsCount, swapPathCount);

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
