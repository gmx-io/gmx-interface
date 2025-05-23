import { Provider } from "ethers";
import { BaseError, decodeErrorResult, Hex } from "viem";
import { withRetry } from "viem";

import { UiContractsChain } from "config/chains";
import { ExpressTxnParams } from "domain/synthetics/express";
import {
  buildAndSignExpressBatchOrderTxn,
  getMultichainInfoFromSigner,
} from "domain/synthetics/express/expressOrderUtils";
import { isLimitSwapOrderType } from "domain/synthetics/orders";
import { TokensData } from "domain/tokens";
import { extendError } from "lib/errors";
import { sendExpressTransaction } from "lib/transactions/sendExpressTransaction";
import { sendWalletTransaction } from "lib/transactions/sendWalletTransaction";
import { TxnCallback, TxnEventBuilder } from "lib/transactions/types";
import { BlockTimestampData } from "lib/useBlockTimestampRequest";
import { WalletSigner } from "lib/wallets";
import { abis } from "sdk/abis";
import { getContract } from "sdk/configs/contracts";
import {
  BatchOrderTxnParams,
  getBatchOrderMulticallPayload,
  getIsInvalidBatchReceiver,
  getIsTwapOrderPayload,
} from "sdk/utils/orderTransactions";

import { signerAddressError } from "components/Errors/errorToasts";

import { getOrdersTriggerPriceOverrides, getSimulationPrices, simulateExecution } from "./simulation";
import { callRelayTransaction } from "../gassless/txns/expressOrderDebug";

export type BatchSimulationParams = {
  tokensData: TokensData;
  blockTimestampData: BlockTimestampData | undefined;
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
  provider,
  batchParams,
  expressParams,
  simulationParams,
  callback,
}: {
  chainId: UiContractsChain;
  signer: WalletSigner;
  provider: Provider | undefined;
  batchParams: BatchOrderTxnParams;
  expressParams: ExpressTxnParams | undefined;
  simulationParams: BatchSimulationParams | undefined;
  callback: TxnCallback<BatchOrderTxnCtx> | undefined;
}) {
  const srcChainId = await getMultichainInfoFromSigner(signer, chainId);

  const eventBuilder = new TxnEventBuilder<BatchOrderTxnCtx>({ expressParams, batchParams, signer });

  try {
    if (srcChainId && !expressParams) {
      throw new Error("Multichain orders are only supported with express params");
    }

    if (srcChainId && !provider) {
      throw new Error("provider is required for multichain txns");
    }
    let runSimulation: () => Promise<void> = DEFAULT_RUN_SIMULATION;

    if (simulationParams && expressParams && srcChainId) {
      runSimulation = async () => {
        const { callData, feeAmount, feeToken, to } = await buildAndSignExpressBatchOrderTxn({
          signer,
          provider,
          chainId,
          relayFeeParams: expressParams.relayFeeParams,
          relayParamsPayload: expressParams.relayParamsPayload,
          batchParams,
          subaccount: expressParams.subaccount,
          emptySignature: true,
          noncesData: undefined,
        });
        try {
          await callRelayTransaction({
            calldata: callData,
            provider: provider!,
            gelatoRelayFeeAmount: feeAmount,
            gelatoRelayFeeToken: feeToken,
            relayRouterAddress: to,
          });
        } catch (error) {
          if ("walk" in error && typeof error.walk === "function") {
            const errorWithData = (error as BaseError).walk((e) => "data" in (e as any)) as
              | (Error & { data: string })
              | null;

            if (errorWithData && errorWithData.data) {
              const data = errorWithData.data;

              const decodedError = decodeErrorResult({
                abi: abis.CustomErrorsArbitrumSepolia,
                data: data as Hex,
              });

              const customError = new Error();

              customError.name = decodedError.errorName;
              customError.message = JSON.stringify(decodedError, null, 2);
              // customError.cause = error;

              throw extendError(customError, {
                errorContext: "simulation",
              });
              // debugger;
            }
          }

          throw extendError(error, {
            errorContext: "simulation",
          });
        }
      };
    } else if (simulationParams) {
      runSimulation = () =>
        makeBatchOrderSimulation({
          chainId,
          // TODO: implement simulation for multichain
          signer,
          batchParams,
          blockTimestampData: simulationParams.blockTimestampData,
          tokensData: simulationParams.tokensData,
          expressParams,
        });
    }

    if (expressParams) {
      await runSimulation().then(() => callback?.(eventBuilder.Simulated()));
      const txnData = await buildAndSignExpressBatchOrderTxn({
        chainId: chainId as UiContractsChain,
        signer,
        provider,
        batchParams,
        relayParamsPayload: expressParams.relayParamsPayload,
        relayerFeeTokenAddress: expressParams.gasPaymentParams.relayerFeeTokenAddress,
        relayerFeeAmount: expressParams.gasPaymentParams.relayerFeeAmount,
        subaccount: expressParams.subaccount,
        noncesData: undefined,
      });

      callback?.(eventBuilder.Sending());

      const res = withRetry(
        () =>
          sendExpressTransaction({
            chainId,
            txnData,
            isSponsoredCall: expressParams.isSponsoredCall,
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

      return res;
    }

    const { callData, value } = getBatchOrderMulticallPayload({ params: batchParams, chainId });

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

export const makeBatchOrderSimulation = async ({
  chainId,
  signer,
  batchParams,
  blockTimestampData,
  tokensData,
  expressParams,
}: {
  chainId: UiContractsChain;
  signer: WalletSigner;
  batchParams: BatchOrderTxnParams;

  blockTimestampData: BlockTimestampData | undefined;
  tokensData: TokensData;
  expressParams: ExpressTxnParams | undefined;
}) => {
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
      (co) => !isLimitSwapOrderType(co.orderPayload.orderType) && !getIsTwapOrderPayload(co.orderPayload)
    );

    // Simulate execution makes sense only for order creation transactions
    if (batchParams.createOrderParams.length === 0 || !isSimulationAllowed) {
      return Promise.resolve();
    }

    const { encodedMulticall, value } = getBatchOrderMulticallPayload({
      chainId,
      params: {
        ...batchParams,
        createOrderParams: [batchParams.createOrderParams[0]],
      },
    });

    return simulateExecution(chainId, {
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
    });
  } catch (error) {
    throw extendError(error, {
      errorContext: "simulation",
    });
  }
};
