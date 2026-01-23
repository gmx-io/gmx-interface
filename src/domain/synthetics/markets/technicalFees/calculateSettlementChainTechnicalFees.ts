import {
  RawCreateGlvDepositParams,
  RawCreateDepositParams,
  RawCreateGlvWithdrawalParams,
  RawCreateWithdrawalParams,
} from "domain/synthetics/markets";
import { estimatePureLpActionExecutionFee } from "domain/synthetics/markets/feeEstimation/estimatePureLpActionExecutionFee";

import { CalculateTechnicalFeesParams, TechnicalGmFees } from "./technical-fees-types";
import { Operation } from "../types";

export async function calculateSettlementChainTechnicalFees(
  params: CalculateTechnicalFeesParams
): Promise<TechnicalGmFees | undefined> {
  if (params.operation === Operation.Deposit) {
    const castedParams = params.rawParams as RawCreateGlvDepositParams | RawCreateDepositParams;

    const swapsCount = BigInt(
      castedParams.addresses.longTokenSwapPath.length + castedParams.addresses.shortTokenSwapPath.length
    );

    const fees = estimatePureLpActionExecutionFee({
      action: params.isGlv
        ? {
            operation: Operation.Deposit,
            isGlv: true,
            marketsCount: BigInt(params.glvInfo!.markets.length),
            swapsCount,
            isMarketTokenDeposit: (params.rawParams as RawCreateGlvDepositParams).isMarketTokenDeposit,
          }
        : {
            operation: Operation.Deposit,
            isGlv: false,
            swapsCount,
          },
      chainId: params.chainId,
      gasLimits: params.gasLimits,
      tokensData: params.tokensData,
      gasPrice: params.gasPrice,
    });

    return {
      kind: "settlementChain",
      fees,
      isDeposit: true,
      isGlv: params.isGlv,
    };
  } else if (params.operation === Operation.Withdrawal) {
    const castedParams = params.rawParams as RawCreateGlvWithdrawalParams | RawCreateWithdrawalParams;

    const swapsCount = BigInt(
      castedParams.addresses.longTokenSwapPath.length + castedParams.addresses.shortTokenSwapPath.length
    );

    const fees = estimatePureLpActionExecutionFee({
      action: params.isGlv
        ? {
            operation: Operation.Withdrawal,
            isGlv: true,
            marketsCount: BigInt(params.glvInfo!.markets.length),
            swapsCount,
          }
        : {
            operation: Operation.Withdrawal,
            isGlv: false,
            swapsCount,
          },
      chainId: params.chainId,
      gasLimits: params.gasLimits,
      tokensData: params.tokensData,
      gasPrice: params.gasPrice,
    });

    return {
      kind: "settlementChain",
      fees,
      isDeposit: false,
      isGlv: params.isGlv,
    };
  }
}
