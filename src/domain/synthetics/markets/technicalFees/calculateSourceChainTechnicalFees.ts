import { SettlementChainId, SourceChainId } from "config/chains";
import {
  RawCreateGlvDepositParams,
  RawCreateDepositParams,
  RawCreateGlvWithdrawalParams,
  RawCreateWithdrawalParams,
} from "domain/synthetics/markets";
import { estimateSourceChainDepositFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainDepositFees";
import { estimateSourceChainGlvDepositFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainGlvDepositFees";
import { estimateSourceChainGlvWithdrawalFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainGlvWithdrawalFees";
import { estimateSourceChainWithdrawalFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainWithdrawalFees";
import { MARKETS } from "sdk/configs/markets";
import { WithdrawalAmounts } from "sdk/types/trade";

import { CalculateTechnicalFeesParams, TechnicalGmFees } from "./technical-fees-types";
import { Operation } from "../types";

export async function calculateSourceChainTechnicalFees(
  params: CalculateTechnicalFeesParams
): Promise<TechnicalGmFees | undefined> {
  if (params.firstTokenAddress === undefined || params.firstTokenAmount === undefined || !params.globalExpressParams) {
    return undefined;
  }
  if (params.operation === Operation.Deposit) {
    if (params.isGlv) {
      const castedParams = params.rawParams as RawCreateGlvDepositParams;
      const fees = await estimateSourceChainGlvDepositFees({
        chainId: params.chainId as SettlementChainId,
        srcChainId: params.srcChainId as SourceChainId,
        params: castedParams,
        tokenAddress: params.firstTokenAddress,
        tokenAmount: params.firstTokenAmount,
        globalExpressParams: params.globalExpressParams,
        glvMarketCount: BigInt(params.glvInfo!.markets.length),
      });

      return {
        kind: "sourceChain",
        isGlv: true,
        isDeposit: true,
        fees,
      };
    } else {
      const castedParams = params.rawParams as RawCreateDepositParams;
      const fees = await estimateSourceChainDepositFees({
        chainId: params.chainId as SettlementChainId,
        srcChainId: params.srcChainId as SourceChainId,
        params: castedParams,
        tokenAddress: params.firstTokenAddress,
        tokenAmount: params.firstTokenAmount,
        globalExpressParams: params.globalExpressParams,
      });
      return {
        kind: "sourceChain",
        isGlv: false,
        isDeposit: true,
        fees,
      };
    }
  } else if (params.operation === Operation.Withdrawal) {
    if (params.isGlv) {
      const castedParams = params.rawParams as RawCreateGlvWithdrawalParams;
      const glvWithdrawalAmounts = params.amounts as WithdrawalAmounts;
      const outputLongTokenAddress =
        glvWithdrawalAmounts.longTokenSwapPathStats?.tokenOutAddress ?? params.glvInfo!.longTokenAddress;
      const outputShortTokenAddress =
        glvWithdrawalAmounts.shortTokenSwapPathStats?.tokenOutAddress ?? params.glvInfo!.shortTokenAddress;

      const fees = await estimateSourceChainGlvWithdrawalFees({
        chainId: params.chainId as SettlementChainId,
        srcChainId: params.srcChainId as SourceChainId,
        params: castedParams,
        tokenAddress: castedParams.addresses.glv,
        tokenAmount: params.marketTokenAmount,
        globalExpressParams: params.globalExpressParams,
        marketsCount: BigInt(params.glvInfo!.markets.length),
        outputLongTokenAddress,
        outputShortTokenAddress,
      });

      return {
        kind: "sourceChain",
        isGlv: true,
        isDeposit: false,
        fees,
      };
    } else {
      const castedParams = params.rawParams as RawCreateWithdrawalParams;
      if (!params.amounts) {
        return undefined;
      }

      const gmWithdrawalAmounts = params.amounts as WithdrawalAmounts;

      const outputLongTokenAddress =
        gmWithdrawalAmounts.longTokenSwapPathStats?.tokenOutAddress ??
        MARKETS[params.chainId][params.rawParams.addresses.market].longTokenAddress;
      const outputShortTokenAddress =
        gmWithdrawalAmounts.shortTokenSwapPathStats?.tokenOutAddress ??
        MARKETS[params.chainId][params.rawParams.addresses.market].shortTokenAddress;

      const fees = await estimateSourceChainWithdrawalFees({
        chainId: params.chainId as SettlementChainId,
        srcChainId: params.srcChainId as SourceChainId,
        params: castedParams,
        tokenAddress: params.rawParams.addresses.market,
        tokenAmount: params.marketTokenAmount,
        globalExpressParams: params.globalExpressParams,
        outputLongTokenAddress,
        outputShortTokenAddress,
      });

      return {
        kind: "sourceChain",
        isGlv: false,
        isDeposit: false,
        fees,
      };
    }
  }
}
