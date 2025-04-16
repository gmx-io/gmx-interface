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
  needGasPaymentTokenApproval: boolean;
  isSponsoredCall: boolean;
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
    pendingExpressTxnParams: {
      shouldResetSubaccountApproval: false,
      shouldResetTokenPermits: false,
      isSponsoredCall: expressParams?.isSponsoredCall ?? false,
      taskId: "",
    },
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

      eventParams.pendingExpressTxnParams!.shouldResetSubaccountApproval = !txnData.isEmptySubaccountApproval;
      eventParams.pendingExpressTxnParams!.shouldResetTokenPermits = txnData.tokenPermits.length > 0;

      callback?.({
        event: TxnEventName.TxnPrepared,
        txnParams: eventParams,
        data: {},
      });

      const createdAt = Date.now();

      const res = await withRetry(
        () =>
          sendExpressTxn({
            chainId,
            txnData,
            isSponsoredCall: expressParams.isSponsoredCall,
          })
            .then(async (res) => {
              eventParams.pendingExpressTxnParams!.taskId = res.taskId;

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
            })
            .catch((error) => {
              throw extendError(error, {
                errorContext: "sending",
              });
            }),
        {
          retryCount: 3,
        }
      );

      if (res) {
        return res;
      }
    }

    return sendBatchOrderWalletTxn({
      chainId,
      signer,
      params: batchParams,
      simulationParams: undefined,
      callback,
    });
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
