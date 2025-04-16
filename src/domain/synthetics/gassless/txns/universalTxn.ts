import { Signer } from "ethers";
import { withRetry, zeroHash } from "viem";

import { extendError } from "lib/errors";
import { RelayParamsPayload } from "sdk/types/expressTransactions";
import { BatchOrderTxnParams } from "sdk/utils/orderTransactions";

import { buildAndSignExpressBatchOrderTxn, RelayFeeSwapParams, sendExpressTxn } from "./expressOrderUtils";
import { Subaccount } from "./subaccountUtils";
import {
  BatchOrderTxnEventParams,
  makeBatchOrderSimulation,
  sendBatchOrderWalletTxn,
  SimulationParams,
  TxnCallback,
  TxnEventName,
} from "./walletTxnBuilder";

export type ExpressParams = {
  subaccount: Subaccount | undefined;
  relayParamsPayload: Omit<RelayParamsPayload, "deadline" | "userNonce">;
  relayFeeParams: RelayFeeSwapParams;
};

export async function sendUniversalBatchTxn({
  chainId,
  signer,
  batchParams,
  expressParams,
  simulationParams,
  callback,
}: {
  chainId: number;
  signer: Signer;
  batchParams: BatchOrderTxnParams;
  expressParams: ExpressParams | undefined;
  simulationParams: SimulationParams | undefined;
  callback: TxnCallback<BatchOrderTxnEventParams> | undefined;
}) {
  const eventParams: BatchOrderTxnEventParams = {
    type: "batchOrder",
    mode: expressParams ? "express" : "wallet",
    chainId,
    signer,
    params: batchParams,
    pendingExpressTxnParams: undefined,
  };

  try {
    if (simulationParams) {
      await makeBatchOrderSimulation({
        chainId,
        account: await signer.getAddress(),
        params: batchParams,
        blockTimestampData: simulationParams.blockTimestampData,
        tokensData: simulationParams.tokensData,
      })
        .then(() => {
          callback?.({
            txnParams: eventParams,
            event: TxnEventName.TxnSimulated,
            data: {},
          });
        })
        .catch((error) => {
          throw extendError(error, {
            errorContext: "simulation",
          });
        });
    }

    if (expressParams) {
      const txnData = await buildAndSignExpressBatchOrderTxn({
        chainId,
        signer,
        batchParams,
        relayParamsPayload: expressParams.relayParamsPayload,
        relayFeeParams: expressParams.relayFeeParams,
        subaccount: expressParams.subaccount,
      });

      callback?.({
        event: TxnEventName.TxnPrepared,
        txnParams: eventParams,
        data: {},
      });

      const createdAt = Date.now();

      return await withRetry(
        () =>
          sendExpressTxn({
            chainId,
            txnData,
          }).then(async (res) => {
            eventParams.pendingExpressTxnParams = {
              shouldResetSubaccountApproval: !txnData.isEmptySubaccountApproval,
              shouldResetTokenPermits: txnData.tokenPermits.length > 0,
              taskId: res.taskId,
            };

            callback?.({
              event: TxnEventName.TxnSent,
              txnParams: eventParams,
              data: {
                txnHash: zeroHash,
                blockNumber: BigInt(await signer.provider!.getBlockNumber()),
                createdAt,
              },
            });

            return res;
          }),
        {
          retryCount: 3,
        }
      );
    } else {
      return sendBatchOrderWalletTxn({
        chainId,
        signer,
        params: batchParams,
        simulationParams: undefined,
        callback,
      });
    }
  } catch (error) {
    callback?.({
      txnParams: eventParams,
      event: TxnEventName.TxnError,
      data: {
        error,
      },
    });

    throw error;
  }
}
