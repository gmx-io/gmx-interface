import { Provider } from "ethers";
import { withRetry } from "viem";

import { ContractsChainId } from "config/chains";
import { ExpressTxnParams } from "domain/synthetics/express";
import { buildAndSignExpressBatchOrderTxn } from "domain/synthetics/express/expressOrderUtils";
import { GlvShiftParam } from "domain/synthetics/markets/useJitLiquidity";
import { isLimitOrderType, isTriggerDecreaseOrderType } from "domain/synthetics/orders";
import { TokensData } from "domain/tokens";
import { decodeErrorFromViemError, extendError, isCustomError } from "lib/errors";
import { sendExpressTransaction } from "lib/transactions/sendExpressTransaction";
import { sendWalletTransaction } from "lib/transactions/sendWalletTransaction";
import { TxnCallback, TxnEventBuilder } from "lib/transactions/types";
import { BlockTimestampData } from "lib/useBlockTimestampRequest";
import { WalletSigner } from "lib/wallets";
import { getContract } from "sdk/configs/contracts";
import { OrderType } from "sdk/utils/orders/types";
import {
  BatchOrderTxnParams,
  getBatchOrderMulticallPayload,
  getIsInvalidBatchReceiver,
  getIsTwapOrderPayload,
} from "sdk/utils/orderTransactions";

import { signerAddressError } from "components/Errors/errorToasts";

import { getOrdersTriggerPriceOverrides, getSimulationPrices, simulateExecution } from "./simulation";
import { callRelayTransaction } from "../express/callRelayTransaction";

export type BatchSimulationParams = {
  tokensData: TokensData;
  blockTimestampData: BlockTimestampData | undefined;
  jitShiftParamsList?: GlvShiftParam[];
  nativeReserveLiquidity?: bigint;
  markJitStale?: (marketAddress: string) => void;
  refreshJitData?: () => void;
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
  callback,
}: {
  chainId: ContractsChainId;
  signer: WalletSigner;
  isGmxAccount: boolean;
  provider: Provider;
  batchParams: BatchOrderTxnParams;
  expressParams: ExpressTxnParams | undefined;
  simulationParams: BatchSimulationParams | undefined;
  callback: TxnCallback<BatchOrderTxnCtx> | undefined;
}) {
  const eventBuilder = new TxnEventBuilder<BatchOrderTxnCtx>({ expressParams, batchParams, signer });

  try {
    if (isGmxAccount && !expressParams) {
      throw new Error("Multichain orders are only supported with express params");
    }

    if (isGmxAccount && !provider) {
      throw new Error("provider is required for multichain txns");
    }
    callback?.(eventBuilder.Submitted());

    let runSimulation: () => Promise<void> = DEFAULT_RUN_SIMULATION;

    if (simulationParams) {
      runSimulation = () => {
        return makeBatchOrderSimulation({
          chainId,
          signer,
          batchParams,
          blockTimestampData: simulationParams.blockTimestampData,
          tokensData: simulationParams.tokensData,
          expressParams,
          provider,
          isGmxAccount,
          jitShiftParamsList: simulationParams.jitShiftParamsList,
          nativeReserveLiquidity: simulationParams.nativeReserveLiquidity,
          markJitStale: simulationParams.markJitStale,
          refreshJitData: simulationParams.refreshJitData,
        });
      };
    }

    if (expressParams) {
      await runSimulation().then(() => callback?.(eventBuilder.Simulated()));
      const txnData = await buildAndSignExpressBatchOrderTxn({
        chainId,
        signer,
        batchParams,
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

    const { callData, value } = getBatchOrderMulticallPayload({ params: batchParams });

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
  markJitStale,
  refreshJitData,
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
  markJitStale?: (marketAddress: string) => void;
  refreshJitData?: () => void;
}): Promise<void> => {
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
      const isIncreaseOrder = orderPayload.orderType === OrderType.MarketIncrease;
      const needsJit =
        isIncreaseOrder &&
        jitShiftParamsList !== undefined &&
        jitShiftParamsList.length > 0 &&
        nativeReserveLiquidity !== undefined &&
        orderPayload.numbers.sizeDeltaUsd > nativeReserveLiquidity;

      const simulationMethod = needsJit ? "simulateExecuteLatestJitOrder" : "simulateExecuteLatestOrder";

      // eslint-disable-next-line no-console
      console.log(
        `%c[JIT Simulation] ${simulationMethod}`,
        needsJit ? "color: #00ff88; font-weight: bold" : "color: #888",
        needsJit
          ? {
              market: orderPayload.addresses.market,
              sizeDeltaUsd: orderPayload.numbers.sizeDeltaUsd.toString(),
              nativeReserveLiquidity: nativeReserveLiquidity?.toString(),
              shiftParams: jitShiftParamsList?.length,
            }
          : {
              market: orderPayload.addresses.market,
              sizeDeltaUsd: orderPayload.numbers.sizeDeltaUsd.toString(),
              nativeReserveLiquidity: nativeReserveLiquidity?.toString(),
              reason: !isIncreaseOrder
                ? "not MarketIncrease"
                : !jitShiftParamsList?.length
                  ? "no shift params for this market"
                  : "size fits native reserve",
            }
      );

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
        });
      } catch (error) {
        if (needsJit && isJitShiftError(error)) {
          // eslint-disable-next-line no-console
          console.log("%c[JIT Simulation] Shift error → marking stale for 60s", "color: #ff4444; font-weight: bold", {
            market: orderPayload.addresses.market,
            error: String(error),
          });
          markJitStale?.(orderPayload.addresses.market);
          refreshJitData?.();
          throw new Error("Insufficient liquidity");
        }
        throw error;
      }
    }
  } catch (error) {
    throw extendError(error, {
      errorContext: "simulation",
    });
  }
};

const JIT_SHIFT_ERROR_NAMES = new Set([
  "GlvInsufficientMarketTokenBalance",
  "GlvShiftMaxPriceImpactExceeded",
  "GlvMaxMarketTokenBalanceUsdExceeded",
  "GlvDisabledMarket",
  "GlvShiftIntervalNotYetPassed",
]);

function isJitShiftError(error: unknown): boolean {
  if (error instanceof Error && isCustomError(error)) {
    return JIT_SHIFT_ERROR_NAMES.has(error.name);
  }

  const decoded = decodeErrorFromViemError(error);
  return decoded !== undefined && JIT_SHIFT_ERROR_NAMES.has(decoded.name);
}
