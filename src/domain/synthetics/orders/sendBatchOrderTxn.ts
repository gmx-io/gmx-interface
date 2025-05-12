import { ExpressTxnParams } from "domain/synthetics/express";
import { isLimitSwapOrderType } from "domain/synthetics/orders";
import { buildAndSignExpressBatchOrderTxn } from "domain/synthetics/orders/expressOrderUtils";
import { TokensData } from "domain/tokens";
import { extendError } from "lib/errors";
import { sendExpressTransaction } from "lib/transactions/sendExpressTransaction";
import { sendWalletTransaction } from "lib/transactions/sendWalletTransaction";
import { TxnCallback, TxnEventBuilder } from "lib/transactions/types";
import { BlockTimestampData } from "lib/useBlockTimestampRequest";
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

import { WalletSigner } from "lib/wallets";
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
};

export async function sendBatchOrderTxn({
  chainId,
  signer,
  batchParams,
  expressParams,
  simulationParams,
  callback,
}: {
  chainId: number;
  signer: WalletSigner;
  batchParams: BatchOrderTxnParams;
  expressParams: ExpressTxnParams | undefined;
  simulationParams: BatchSimulationParams | undefined;
  callback: TxnCallback<BatchOrderTxnCtx> | undefined;
}) {
  const eventBuilder = new TxnEventBuilder<BatchOrderTxnCtx>({ expressParams, batchParams });

  try {
    const runSimulation = async () =>
      simulationParams
        ? makeBatchOrderSimulation({
            chainId,
            signer,
            batchParams,
            blockTimestampData: simulationParams.blockTimestampData,
            tokensData: simulationParams.tokensData,
            expressParams,
          })
        : Promise.resolve(undefined);

    if (expressParams && !expressParams.relayFeeParams.isOutGasTokenBalance) {
      await runSimulation().then(() => callback?.(eventBuilder.Simulated()));

      const txnData = await buildAndSignExpressBatchOrderTxn({
        chainId,
        signer,
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
          isSponsoredCall: expressParams.isSponsoredCall,
        }),
        sleep(10000).then(() => {
          throw new Error("Gelato SDK Timeout");
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

export const makeBatchOrderSimulation = async ({
  chainId,
  signer,
  batchParams,
  blockTimestampData,
  tokensData,
  expressParams,
}: {
  chainId: number;
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
