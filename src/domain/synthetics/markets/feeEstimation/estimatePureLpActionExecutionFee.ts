import type { ExecutionFee, GasLimitsConfig } from "domain/synthetics/fees";
import type { TokensData } from "domain/synthetics/tokens/types";
import { ContractsChainId } from "sdk/configs/chains";
import {
  estimateDepositOraclePriceCount,
  estimateExecuteDepositGasLimit,
  estimateExecuteGlvDepositGasLimit,
  estimateExecuteGlvWithdrawalGasLimit,
  estimateExecuteWithdrawalGasLimit,
  estimateGlvDepositOraclePriceCount,
  estimateGlvWithdrawalOraclePriceCount,
  estimateWithdrawalOraclePriceCount,
  getExecutionFee,
} from "sdk/utils/fees";

import { Operation } from "../types";

export type PureAction =
  | { operation: Operation.Deposit; isGlv: false; swapsCount: bigint }
  | { operation: Operation.Withdrawal; isGlv: false; swapsCount: bigint }
  | {
      operation: Operation.Deposit;
      isGlv: true;
      marketsCount: bigint;
      swapsCount: bigint;
      isMarketTokenDeposit: boolean;
    }
  | { operation: Operation.Withdrawal; isGlv: true; marketsCount: bigint; swapsCount: bigint };

export function estimatePureLpActionExecutionFee({
  action,
  chainId,
  tokensData,
  gasPrice,
  gasLimits,
}: {
  action: PureAction;
  chainId: ContractsChainId;
  gasLimits: GasLimitsConfig;
  tokensData: TokensData;
  gasPrice: bigint;
}): ExecutionFee {
  let gasLimit = 0n;
  let oraclePriceCount = 0n;
  if (action.operation === Operation.Deposit && action.isGlv === false) {
    gasLimit = estimateExecuteDepositGasLimit(gasLimits, { swapsCount: action.swapsCount });
    oraclePriceCount = estimateDepositOraclePriceCount(action.swapsCount);
  } else if (action.operation === Operation.Withdrawal && action.isGlv === false) {
    gasLimit = estimateExecuteWithdrawalGasLimit(gasLimits, { swapsCount: action.swapsCount });
    oraclePriceCount = estimateWithdrawalOraclePriceCount(action.swapsCount);
  } else if (action.operation === Operation.Deposit && action.isGlv === true) {
    gasLimit = estimateExecuteGlvDepositGasLimit(gasLimits, {
      swapsCount: action.swapsCount,
      marketsCount: action.marketsCount,
      isMarketTokenDeposit: action.isMarketTokenDeposit,
    });
    oraclePriceCount = estimateGlvDepositOraclePriceCount(action.marketsCount, action.swapsCount);
  } else if (action.operation === Operation.Withdrawal && action.isGlv === true) {
    gasLimit = estimateExecuteGlvWithdrawalGasLimit(gasLimits, {
      swapsCount: action.swapsCount,
      marketsCount: action.marketsCount,
    });
    oraclePriceCount = estimateGlvWithdrawalOraclePriceCount(action.marketsCount, action.swapsCount);
  }

  const executionFee = getExecutionFee(chainId, gasLimits, tokensData, gasLimit, gasPrice, oraclePriceCount);

  if (!executionFee) throw new Error("Execution fee not found");

  return executionFee;
}
