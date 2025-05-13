import { BaseError, Hex, PublicClient, decodeErrorResult } from "viem";

import { UiContractsChain } from "config/chains";
import { ExpressTxnParams } from "domain/synthetics/express";
import { isLimitSwapOrderType } from "domain/synthetics/orders";
import {
  buildAndSignExpressBatchOrderTxn,
  getMultichainInfoFromSigner,
} from "domain/synthetics/orders/expressOrderUtils";
import { TokensData } from "domain/tokens";
import { extendError } from "lib/errors";
import { sendExpressTransaction } from "lib/transactions/sendExpressTransaction";
import { sendWalletTransaction } from "lib/transactions/sendWalletTransaction";
import { TxnCallback, TxnEventBuilder } from "lib/transactions/types";
import { BlockTimestampData } from "lib/useBlockTimestampRequest";
import { WalletSigner } from "lib/wallets";
import { abis } from "sdk/abis";
import { getContract } from "sdk/configs/contracts";
import { sleep } from "sdk/utils/common";
import {
  BatchOrderTxnParams,
  getBatchOrderMulticallPayload,
  getBatchRequiredActions,
  getIsInvalidBatchReceiver,
  isTwapOrderPayload,
} from "sdk/utils/orderTransactions";

import { signerAddressError } from "components/Errors/errorToasts";

import { callRelayTransaction } from "../gassless/txns/expressOrderDebug";
import {
  getIsInvalidSubaccount,
  getIsNonceExpired,
  getIsSubaccountActionsExceeded,
  getIsSubaccountExpired,
} from "../subaccount";
import { getOrdersTriggerPriceOverrides, getSimulationPrices, simulateExecution } from "./simulation";

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
  settlementChainClient,
  batchParams,
  expressParams: rawExpressParams,
  simulationParams,
  callback,
}: {
  chainId: UiContractsChain;
  signer: WalletSigner;
  settlementChainClient?: PublicClient;
  batchParams: BatchOrderTxnParams;
  expressParams: ExpressTxnParams | undefined;
  simulationParams: BatchSimulationParams | undefined;
  callback: TxnCallback<BatchOrderTxnCtx> | undefined;
}) {
  const srcChainId = await getMultichainInfoFromSigner(signer, chainId);
  const expressParams = rawExpressParams?.relayFeeParams.isOutGasTokenBalance ? undefined : rawExpressParams;

  const eventBuilder = new TxnEventBuilder<BatchOrderTxnCtx>({ expressParams, batchParams, signer });

  try {
    if (srcChainId && !expressParams) {
      throw new Error("Multichain orders are only supported with express params");
    }

    if (srcChainId && !settlementChainClient) {
      throw new Error("settlementChainClient is required");
    }
    let runSimulation: () => Promise<void> = DEFAULT_RUN_SIMULATION;

    if (simulationParams && expressParams && srcChainId) {
      runSimulation = async () => {
        if (!settlementChainClient) {
          throw new Error("settlementChainClient is required");
        }

        const { callData, feeAmount, feeToken, to } = await buildAndSignExpressBatchOrderTxn({
          signer,
          settlementChainClient,
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
            client: settlementChainClient!,
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

    if (expressParams && !expressParams.relayFeeParams.isOutGasTokenBalance) {
      await runSimulation().then(() => callback?.(eventBuilder.Simulated()));

      const txnData = await buildAndSignExpressBatchOrderTxn({
        chainId: chainId as UiContractsChain,
        signer,
        settlementChainClient,
        batchParams,
        relayParamsPayload: expressParams.relayParamsPayload,
        relayFeeParams: expressParams.relayFeeParams,
        subaccount: expressParams.subaccount,
        noncesData: undefined,
      });

      callback?.(eventBuilder.Prepared());

      const createdAt = Date.now();

      const res = Promise.race([
        sendExpressTransaction({
          chainId,
          txnData,
          isSponsoredCall: srcChainId ? false : expressParams.isSponsoredCall,
        }),
        sleep(10000).then(() => {
          throw new Error(GELATO_SDK_TIMEOUT_ERROR);
        }),
      ])
        .then(async (res) => {
          callback?.(
            eventBuilder.Sent({
              txnHash: res.taskId,

              blockNumber: BigInt(await signer.provider!.getBlockNumber()),
              createdAt,
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

export const GELATO_SDK_TIMEOUT_ERROR = "Gelato SDK Timeout";

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
  // const account = await signer.getAddress();
  const srcChainId = await getMultichainInfoFromSigner(signer, chainId);

  if (srcChainId) {
    throw new Error("Batch order simulation is not supported for multichain");
  }

  try {
    if (getIsInvalidBatchReceiver(batchParams, signer.address)) {
      throw extendError(new Error(signerAddressError), {
        errorContext: "simulation",
      });
    }

    const requiredActions = getBatchRequiredActions(batchParams);

    if (expressParams?.subaccount && getIsInvalidSubaccount(expressParams.subaccount, requiredActions)) {
      const { onchainData, signedApproval } = expressParams.subaccount;

      throw extendError(new Error("Invalid subaccount"), {
        data: {
          isExpired: getIsSubaccountExpired(expressParams.subaccount),
          isActionsExceeded: getIsSubaccountActionsExceeded(expressParams.subaccount, requiredActions),
          isNonceExceeded: getIsNonceExpired(expressParams.subaccount),
          onchainData: {
            maxAllowedCount: onchainData.maxAllowedCount,
            currentCount: onchainData.currentActionsCount,
            expiresAt: onchainData.expiresAt,
            isActive: onchainData.active,
            nonce: onchainData.approvalNonce,
          },
          signedData: {
            maxAllowedCount: signedApproval.maxAllowedCount,
            expiresAt: signedApproval.expiresAt,
            shouldAdd: signedApproval.shouldAdd,
            nonce: signedApproval.nonce,
          },
        },
      });
    }

    if (expressParams && expressParams.relayFeeParams.isOutGasTokenBalance) {
      throw extendError(new Error("Out of gas token balance"), {
        data: {
          gasPaymentTokenAmount: expressParams.relayFeeParams.gasPaymentTokenAmount,
          gasPaymentTokenAddress: expressParams.relayFeeParams.gasPaymentTokenAddress,
        },
      });
    }

    const isSimulationAllowed = batchParams.createOrderParams.every(
      (co) => !isLimitSwapOrderType(co.orderPayload.orderType) && !isTwapOrderPayload(co.orderPayload)
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
