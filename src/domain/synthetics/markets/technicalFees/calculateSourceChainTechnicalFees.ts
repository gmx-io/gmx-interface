import { SettlementChainId, SourceChainId } from "config/chains";
import {
  RawCreateDepositParams,
  RawCreateGlvDepositParams,
  RawCreateGlvWithdrawalParams,
  RawCreateWithdrawalParams,
} from "domain/synthetics/markets";
import { estimateSourceChainDepositFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainDepositFees";
import { estimateSourceChainGlvDepositFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainGlvDepositFees";
import { estimateSourceChainGlvWithdrawalFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainGlvWithdrawalFees";
import { estimateSourceChainWithdrawalFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainWithdrawalFees";
import { getTokenAddressByMarket } from "sdk/configs/markets";

import { Operation } from "../types";
import { CalculateTechnicalFeesParams, TechnicalGmFees } from "./technical-fees-types";

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
      const outputLongTokenAddress = params.outputLongTokenAddress ?? params.glvInfo!.longTokenAddress;
      const outputShortTokenAddress = params.outputShortTokenAddress ?? params.glvInfo!.shortTokenAddress;

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
      const outputLongTokenAddress =
        params.outputLongTokenAddress ??
        getTokenAddressByMarket(params.chainId, params.rawParams.addresses.market, "long");
      const outputShortTokenAddress =
        params.outputShortTokenAddress ??
        getTokenAddressByMarket(params.chainId, params.rawParams.addresses.market, "short");

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
