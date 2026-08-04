import { Provider } from "ethers";
import { withRetry } from "viem";
import type { Address } from "viem";

import { ContractsChainId } from "config/chains";
import { getSwapDebugSettings } from "config/externalSwaps";
import { ExpressTxnParams } from "domain/synthetics/express";
import { buildAndSignExpressBatchOrderTxn } from "domain/synthetics/express/expressOrderUtils";
import { GlvShiftParam } from "domain/synthetics/jit/utils";
import { isLimitOrderType, isTriggerDecreaseOrderType } from "domain/synthetics/orders";
import { TokensData } from "domain/tokens";
import { extendError } from "lib/errors";
import { getTenderlyConfig } from "lib/tenderly";
import { sendExpressTransaction } from "lib/transactions/sendExpressTransaction";
import { sendWalletCalls } from "lib/transactions/sendWalletCalls";
import type { WalletCall, WalletCallsAnalyticsContext } from "lib/transactions/sendWalletCalls";
import { sendWalletTransaction } from "lib/transactions/sendWalletTransaction";
import { TxnCallback, TxnEventBuilder } from "lib/transactions/types";
import { BlockTimestampData } from "lib/useBlockTimestampRequest";
import { WalletSigner } from "lib/wallets";
import { getContract } from "sdk/configs/contracts";
import {
  BatchOrderTxnParams,
  getBatchOrderMulticallPayload,
  getIsInvalidBatchReceiver,
  getIsTwapOrderPayload,
} from "sdk/utils/orderTransactions";

import { signerAddressError } from "components/Errors/errorToasts";

import { encodeJitBatchOrderMetadata, getNeedsJitOrder, isJitShiftError } from "./jitOrderUtils";
import { getOrdersTriggerPriceOverrides, getSimulationPrices, simulateExecution } from "./simulation";
import { callRelayTransaction } from "../express/callRelayTransaction";

export type BatchSimulationParams = {
  tokensData: TokensData;
  blockTimestampData: BlockTimestampData | undefined;
  jitShiftParamsList?: GlvShiftParam[];
  nativeReserveLiquidity?: bigint;
};

export type BatchOrderTxnCtx = {
  expressParams: ExpressTxnParams | undefined;
  batchParams: BatchOrderTxnParams;
  signer: WalletSigner;
};

const DEFAULT_RUN_SIMULATION = () => Promise.resolve(undefined);

export async function sendBatchOrderTxn({
  chainId,
  signer,
  isGmxAccount,
  provider,
  batchParams,
  expressParams,
  simulationParams,
  approvalCalls,
  approvalAnalytics,
  callback,
}: {
  chainId: ContractsChainId;
  signer: WalletSigner;
  isGmxAccount: boolean;
  provider: Provider;
  batchParams: BatchOrderTxnParams;
  expressParams: ExpressTxnParams | undefined;
  simulationParams: BatchSimulationParams | undefined;
  approvalCalls?: WalletCall[];
  approvalAnalytics?: WalletCallsAnalyticsContext;
  callback: TxnCallback<BatchOrderTxnCtx> | undefined;
}) {
  const encodedBatchParams = encodeJitBatchOrderMetadata(batchParams, simulationParams);
  const eventBuilder = new TxnEventBuilder<BatchOrderTxnCtx>({
    expressParams,
    batchParams: encodedBatchParams,
    signer,
  });

  try {
    if (isGmxAccount && !expressParams) {
      throw new Error("Multichain orders are only supported with express params");
    }

    if (isGmxAccount && !provider) {
      throw new Error("provider is required for multichain txns");
    }
    if (expressParams && approvalCalls?.length) {
      throw new Error("Approval calls cannot be included in an Express order");
    }
    callback?.(eventBuilder.Submitted());

    let runSimulation: () => Promise<void> = DEFAULT_RUN_SIMULATION;

    if (simulationParams) {
      runSimulation = () => {
        return makeBatchOrderSimulation({
          chainId,
          signer,
          batchParams: encodedBatchParams,
          blockTimestampData: simulationParams.blockTimestampData,
          tokensData: simulationParams.tokensData,
          expressParams,
          provider,
          isGmxAccount,
          jitShiftParamsList: simulationParams.jitShiftParamsList,
          nativeReserveLiquidity: simulationParams.nativeReserveLiquidity,
          approvalCalls,
        });
      };
    }

    if (getSwapDebugSettings()?.failExternalSwaps && getBatchHasExternalSwap(expressParams, encodedBatchParams)) {
      runSimulation = () =>
        Promise.reject(
          extendError(new Error("Debug fail external swaps: execution reverted"), {
            errorContext: "simulation",
          })
        );
    }

    if (expressParams) {
      await runSimulation().then(() => callback?.(eventBuilder.Simulated()));
      const txnData = await buildAndSignExpressBatchOrderTxn({
        chainId,
        signer,
        batchParams: encodedBatchParams,
        relayParamsPayload: expressParams.relayParamsPayload,
        relayerFeeTokenAddress: expressParams.gasPaymentParams.relayerFeeTokenAddress,
        relayerFeeAmount: expressParams.gasPaymentParams.relayerFeeAmount,
        subaccount: expressParams.subaccount,
        isGmxAccount,
      });

      callback?.(eventBuilder.Sending());

      const res = withRetry(
        () =>
          sendExpressTransaction({
            chainId,
            txnData,
          }),
        {
          retryCount: 3,
          delay: 300,
        }
      )
        .then(async (res) => {
          callback?.(
            eventBuilder.Sent({
              type: "relay",
              relayTaskId: res.taskId,
            })
          );

          return res;
        })
        .catch((error) => {
          throw extendError(error, {
            errorContext: "sending",
          });
        });

      return await res;
    }

    const { callData, value } = getBatchOrderMulticallPayload({ params: encodedBatchParams });

    if (approvalCalls?.length) {
      await runSimulation().then(() => callback?.(eventBuilder.Simulated()));

      if (getTenderlyConfig()) {
        return {
          transactionHash: undefined,
          wait: async () => ({
            transactionHash: undefined,
            blockNumber: undefined,
            status: "success" as const,
          }),
        };
      }

      callback?.(eventBuilder.Sending());

      const result = await sendWalletCalls({
        chainId,
        account: signer.address as Address,
        calls: [
          ...approvalCalls,
          {
            to: getContract(chainId, "ExchangeRouter") as Address,
            data: callData as `0x${string}`,
            value,
          },
        ],
        analytics: approvalAnalytics,
      }).catch((error) => {
        throw extendError(error, {
          errorContext: "sending",
        });
      });

      callback?.(
        eventBuilder.Sent({
          type: "walletCalls",
          callBundleId: result.id,
          getCallsStatus: result.getStatus,
        })
      );

      return result;
    }

    return sendWalletTransaction({
      chainId,
      signer,
      to: getContract(chainId, "ExchangeRouter"),
      callData,
      value,
      runSimulation,
      callback: (event) => {
        callback?.(eventBuilder.extend(event));
      },
    });
  } catch (error) {
    callback?.(eventBuilder.Error(error));

    throw error;
  }
}

const makeBatchOrderSimulation = async ({
  chainId,
  signer,
  isGmxAccount,
  provider,
  batchParams,
  blockTimestampData,
  tokensData,
  expressParams,
  jitShiftParamsList,
  nativeReserveLiquidity,
  approvalCalls,
}: {
  chainId: ContractsChainId;
  signer: WalletSigner;
  isGmxAccount: boolean;
  provider: Provider;
  batchParams: BatchOrderTxnParams;
  blockTimestampData: BlockTimestampData | undefined;
  tokensData: TokensData;
  expressParams: ExpressTxnParams | undefined;
  jitShiftParamsList?: GlvShiftParam[];
  nativeReserveLiquidity?: bigint;
  approvalCalls?: WalletCall[];
}): Promise<void> => {
  let simulationMethod: "simulateExecuteLatestOrder" | "simulateExecuteLatestJitOrder" | undefined;

  try {
    if (getIsInvalidBatchReceiver(batchParams, signer.address)) {
      throw extendError(new Error(signerAddressError), {
        errorContext: "simulation",
      });
    }

    if (
      expressParams?.subaccount &&
      expressParams?.subaccountValidations &&
      !expressParams.subaccountValidations.isValid
    ) {
      const { onchainData, signedApproval } = expressParams.subaccount;

      throw extendError(new Error("Invalid subaccount"), {
        data: {
          isExpired: expressParams.subaccountValidations.isExpired,
          isActionsExceeded: expressParams.subaccountValidations.isActionsExceeded,
          isNonceExceeded: expressParams.subaccountValidations.isNonceExpired,
          onchainData: {
            maxAllowedCount: onchainData.maxAllowedCount,
            currentCount: onchainData.currentActionsCount,
            expiresAt: onchainData.expiresAt,
            isActive: onchainData.active,
            nonce: onchainData.approvalNonce,
            multichainNonce: onchainData.multichainApprovalNonce,
            integrationId: onchainData.integrationId,
          },
          signedData: {
            maxAllowedCount: signedApproval.maxAllowedCount,
            expiresAt: signedApproval.expiresAt,
            shouldAdd: signedApproval.shouldAdd,
            nonce: signedApproval.nonce,
            integrationId: signedApproval.integrationId,
          },
        },
      });
    }

    if (expressParams && expressParams.gasPaymentValidations.isOutGasTokenBalance) {
      throw extendError(new Error("Out of gas token balance"), {
        data: {
          gasPaymentTokenAmount: expressParams.gasPaymentParams.gasPaymentTokenAmount,
          gasPaymentTokenAddress: expressParams.gasPaymentParams.gasPaymentTokenAddress,
        },
      });
    }

    if (expressParams && expressParams.gasPaymentValidations.needGasPaymentTokenApproval) {
      throw extendError(new Error("Need gas payment token approval"), {
        data: {
          gasPaymentTokenAmount: expressParams.gasPaymentParams.gasPaymentTokenAmount,
          gasPaymentTokenAddress: expressParams.gasPaymentParams.gasPaymentTokenAddress,
        },
      });
    }

    const isSimulationAllowed = batchParams.createOrderParams.every(
      (co) =>
        !isLimitOrderType(co.orderPayload.orderType) &&
        !isTriggerDecreaseOrderType(co.orderPayload.orderType) &&
        !getIsTwapOrderPayload(co.orderPayload)
    );

    // Simulate execution makes sense only for order creation transactions
    if (batchParams.createOrderParams.length === 0 || !isSimulationAllowed) {
      return Promise.resolve();
    }

    if (isGmxAccount) {
      if (!expressParams) {
        throw new Error("Multichain orders are only supported with express params");
      }

      const { callData, feeAmount, feeToken, to } = await buildAndSignExpressBatchOrderTxn({
        signer,
        chainId,
        relayParamsPayload: expressParams.relayParamsPayload,
        batchParams: batchParams,
        subaccount: expressParams.subaccount,
        emptySignature: true,
        relayerFeeTokenAddress: expressParams.gasPaymentParams.relayerFeeTokenAddress,
        relayerFeeAmount: expressParams.gasPaymentParams.relayerFeeAmount,
        isGmxAccount,
      });

      await callRelayTransaction({
        chainId,
        relayRouterAddress: to,
        gelatoRelayFeeToken: feeToken,
        gelatoRelayFeeAmount: feeAmount,
        provider,
        calldata: callData,
      });
    } else {
      const { encodedMulticall, value } = getBatchOrderMulticallPayload({
        params: {
          ...batchParams,
          createOrderParams: [batchParams.createOrderParams[0]],
        },
      });

      const orderPayload = batchParams.createOrderParams[0].orderPayload;
      const needsJit = getNeedsJitOrder({
        orderPayload,
        jitShiftParamsList,
        nativeReserveLiquidity,
      });

      simulationMethod = needsJit ? "simulateExecuteLatestJitOrder" : "simulateExecuteLatestOrder";

      try {
        await simulateExecution(chainId, {
          account: signer.address,
          prices: getSimulationPrices(
            chainId,
            tokensData,
            getOrdersTriggerPriceOverrides([batchParams.createOrderParams[0]])
          ),
          tokenPermits: expressParams?.relayParamsPayload.tokenPermits ?? [],
          createMulticallPayload: encodedMulticall,
          value,
          blockTimestampData,
          isExpress: Boolean(expressParams),
          method: simulationMethod,
          jitShiftParamsList: needsJit ? jitShiftParamsList : undefined,
          preCalls: approvalCalls,
        });
      } catch (error) {
        if (needsJit && isJitShiftError(error)) {
          throw new Error("Insufficient liquidity");
        }
        throw error;
      }
    }
  } catch (error) {
    throw extendError(error, {
      errorContext: "simulation",
      simulationMethod,
    });
  }
};

function getBatchHasExternalSwap(expressParams: ExpressTxnParams | undefined, batchParams: BatchOrderTxnParams) {
  return Boolean(
    expressParams?.relayParamsPayload.externalCalls.externalCallDataList.length ||
      batchParams.createOrderParams.some((cp) => cp.tokenTransfersParams?.externalCalls?.externalCallDataList.length)
  );
}
