import { estimateArbitraryRelayFee, getRawBaseRelayerParams } from "domain/multichain/arbitraryRelayParams";
import { ExpressTransactionBuilder } from "domain/synthetics/express";
import {
  RawCreateDepositParams,
  RawCreateGlvDepositParams,
  RawCreateGlvWithdrawalParams,
  RawCreateWithdrawalParams,
} from "domain/synthetics/markets";
import { buildAndSignMultichainDepositTxn } from "domain/synthetics/markets/createMultichainDepositTxn";
import { buildAndSignMultichainGlvDepositTxn } from "domain/synthetics/markets/createMultichainGlvDepositTxn";
import { buildAndSignMultichainGlvWithdrawalTxn } from "domain/synthetics/markets/createMultichainGlvWithdrawalTxn";
import { buildAndSignMultichainWithdrawalTxn } from "domain/synthetics/markets/createMultichainWithdrawalTxn";
import { estimatePureLpActionExecutionFee } from "domain/synthetics/markets/feeEstimation/estimatePureLpActionExecutionFee";
import { convertToUsd } from "domain/tokens";
import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { nowInSeconds } from "sdk/utils/time";

import { buildDepositTransferRequests } from "../buildDepositTransferRequests";
import { buildWithdrawalTransferRequests } from "../buildWithdrawalTransferRequests";
import { CalculateTechnicalFeesParams, TechnicalGmFees } from "./technical-fees-types";
import { Operation } from "../types";

type GmxAccountFeesParams = CalculateTechnicalFeesParams &
  Required<ReturnType<typeof getRawBaseRelayerParams>> & {
    globalExpressParams: NonNullable<CalculateTechnicalFeesParams["globalExpressParams"]>;
  };

async function calculateGmxAccountDepositTechnicalFees(
  params: GmxAccountFeesParams
): Promise<TechnicalGmFees | undefined> {
  const castedParams = params.rawParams as RawCreateGlvDepositParams | RawCreateDepositParams;

  const swapsCount = BigInt(
    castedParams.addresses.longTokenSwapPath.length + castedParams.addresses.shortTokenSwapPath.length
  );

  const executionFee = estimatePureLpActionExecutionFee({
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

  const transferRequests = buildDepositTransferRequests({
    isDeposit: true,
    isGlv: params.isGlv,
    chainId: params.chainId,
    paySource: params.paySource,
    isMarketTokenDeposit: params.isGlv ? (params.rawParams as RawCreateGlvDepositParams).isMarketTokenDeposit : false,
    marketTokenAddress: params.isGlv ? params.rawParams.addresses.market : undefined,
    marketTokenAmount: params.isGlv ? params.firstTokenAmount : 0n,
    longTokenAmount: params.longTokenAmount,
    shortTokenAmount: params.shortTokenAmount,
    initialLongTokenAddress: castedParams.addresses.initialLongToken,
    initialShortTokenAddress: castedParams.addresses.initialShortToken,
    technicalFees: undefined,
  });

  if (!transferRequests) {
    return undefined;
  }

  const expressTransactionBuilder: ExpressTransactionBuilder = async ({ relayParams, gasPaymentParams }) => {
    if (params.isGlv) {
      const glvParams = params.rawParams as RawCreateGlvDepositParams;
      return {
        txnData: await buildAndSignMultichainGlvDepositTxn({
          chainId: params.chainId,
          srcChainId: params.srcChainId,
          emptySignature: true,
          signer: undefined,
          account: params.rawParams.addresses.receiver,
          params: { ...glvParams, executionFee: executionFee.feeTokenAmount },
          relayerFeeAmount: gasPaymentParams.relayerFeeAmount,
          relayerFeeTokenAddress: gasPaymentParams.relayerFeeTokenAddress,
          relayParams: {
            ...relayParams,
            deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
          },
          transferRequests,
        }),
      };
    } else {
      const depositParams = params.rawParams as RawCreateDepositParams;
      return {
        txnData: await buildAndSignMultichainDepositTxn({
          chainId: params.chainId,
          srcChainId: params.srcChainId,
          emptySignature: true,
          signer: undefined,
          account: params.rawParams.addresses.receiver,
          params: { ...depositParams, executionFee: executionFee.feeTokenAmount },
          relayerFeeAmount: gasPaymentParams.relayerFeeAmount,
          relayerFeeTokenAddress: gasPaymentParams.relayerFeeTokenAddress,
          relayParams: {
            ...relayParams,
            deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
          },
          transferRequests,
        }),
      };
    }
  };

  const relayFee = await estimateArbitraryRelayFee({
    account: params.rawParams.addresses.receiver,
    chainId: params.chainId,
    client: getPublicClientWithRpc(params.chainId),
    rawRelayParamsPayload: params.rawBaseRelayParamsPayload,
    expressTransactionBuilder: expressTransactionBuilder,
    gasPaymentParams: params.baseRelayFeeSwapParams.gasPaymentParams,
    subaccount: undefined,
  });

  const relayFeeUsd = convertToUsd(
    relayFee,
    params.globalExpressParams.relayerFeeToken.decimals,
    params.globalExpressParams.relayerFeeToken.prices.maxPrice
  )!;

  return {
    kind: "gmxAccount",
    fees: {
      executionFee,
      relayFeeUsd,
    },
    isDeposit: true,
    isGlv: params.isGlv,
  };
}

async function calculateGmxAccountWithdrawalTechnicalFees(
  params: GmxAccountFeesParams
): Promise<TechnicalGmFees | undefined> {
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

  const transferRequests = buildWithdrawalTransferRequests({
    isWithdrawal: true,
    isGlv: params.isGlv,
    chainId: params.chainId,
    glvOrMarketTokenAddress: params.isGlv
      ? (params.rawParams as RawCreateGlvWithdrawalParams).addresses.glv
      : (params.rawParams as RawCreateWithdrawalParams).addresses.market,
    glvOrMarketAmount: params.marketTokenAmount,
  });

  if (!transferRequests) {
    return undefined;
  }

  const expressTransactionBuilder: ExpressTransactionBuilder = async ({ relayParams, gasPaymentParams }) => {
    if (params.isGlv) {
      const glvParams = params.rawParams as RawCreateGlvWithdrawalParams;
      return {
        txnData: await buildAndSignMultichainGlvWithdrawalTxn({
          chainId: params.chainId,
          srcChainId: params.srcChainId,
          emptySignature: true,
          signer: undefined,
          account: params.rawParams.addresses.receiver,
          params: { ...glvParams, executionFee: fees.feeTokenAmount },
          relayerFeeAmount: gasPaymentParams.relayerFeeAmount,
          relayerFeeTokenAddress: gasPaymentParams.relayerFeeTokenAddress,
          relayParams: {
            ...relayParams,
            deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
          },
          transferRequests,
        }),
      };
    } else {
      const withdrawalParams = params.rawParams as RawCreateWithdrawalParams;
      return {
        txnData: await buildAndSignMultichainWithdrawalTxn({
          chainId: params.chainId,
          srcChainId: params.srcChainId,
          emptySignature: true,
          signer: undefined,
          account: params.rawParams.addresses.receiver,
          params: { ...withdrawalParams, executionFee: fees.feeTokenAmount },
          relayerFeeAmount: gasPaymentParams.relayerFeeAmount,
          relayerFeeTokenAddress: gasPaymentParams.relayerFeeTokenAddress,
          relayParams: {
            ...relayParams,
            deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
          },
          transferRequests,
        }),
      };
    }
  };

  const relayFee = await estimateArbitraryRelayFee({
    account: params.rawParams.addresses.receiver,
    chainId: params.chainId,
    client: getPublicClientWithRpc(params.chainId),
    rawRelayParamsPayload: params.rawBaseRelayParamsPayload,
    expressTransactionBuilder: expressTransactionBuilder,
    gasPaymentParams: params.baseRelayFeeSwapParams.gasPaymentParams,
    subaccount: undefined,
  });

  const relayFeeUsd = convertToUsd(
    relayFee,
    params.globalExpressParams.relayerFeeToken.decimals,
    params.globalExpressParams.relayerFeeToken.prices.maxPrice
  )!;

  return {
    kind: "gmxAccount",
    fees: {
      executionFee: fees,
      relayFeeUsd,
    },
    isDeposit: false,
    isGlv: params.isGlv,
  };
}

export async function calculateGmxAccountTechnicalFees(
  params: CalculateTechnicalFeesParams
): Promise<TechnicalGmFees | undefined> {
  if (!params.globalExpressParams) {
    return undefined;
  }

  const { rawBaseRelayParamsPayload, baseRelayFeeSwapParams } = getRawBaseRelayerParams({
    chainId: params.chainId,
    account: params.rawParams.addresses.receiver,
    globalExpressParams: params.globalExpressParams,
  });

  if (!rawBaseRelayParamsPayload || !baseRelayFeeSwapParams) {
    return undefined;
  }

  const feesParams: GmxAccountFeesParams = {
    ...params,
    rawBaseRelayParamsPayload,
    baseRelayFeeSwapParams,
    globalExpressParams: params.globalExpressParams,
  };

  if (params.operation === Operation.Deposit) {
    return calculateGmxAccountDepositTechnicalFees(feesParams);
  } else if (params.operation === Operation.Withdrawal) {
    return calculateGmxAccountWithdrawalTechnicalFees(feesParams);
  }
}
