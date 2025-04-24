import { Signer } from "ethers";
import { withRetry } from "viem";

import { ExpressParams } from "domain/synthetics/express";
import { isLimitSwapOrderType } from "domain/synthetics/orders";
import { buildAndSignExpressBatchOrderTxn } from "domain/synthetics/orders/expressOrderUtils";
import { TokensData } from "domain/tokens";
import { extendError } from "lib/errors";
import { sendExpressTransaction } from "lib/transactions/sendExpressTransaction";
import { sendWalletTransaction } from "lib/transactions/sendWalletTransaction";
import { TxnCallback, TxnEventBuilder } from "lib/transactions/types";
import { BlockTimestampData } from "lib/useBlockTimestampRequest";
import { getContract } from "sdk/configs/contracts";
import { BatchOrderTxnParams, getBatchOrderMulticallPayload } from "sdk/utils/orderTransactions";

import { signerAddressError } from "components/Errors/errorToasts";


import { getOrdersTriggerPriceOverrides, getSimulationPrices, simulateExecution } from "./simulation";

export type BatchSimulationParams = {
  tokensData: TokensData;
  blockTimestampData: BlockTimestampData | undefined;
};

export type BatchOrderTxnCtx = {
  expressParams: ExpressParams | undefined;
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
  signer: Signer;
  batchParams: BatchOrderTxnParams;
  expressParams: ExpressParams | undefined;
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
            params: batchParams,
            blockTimestampData: simulationParams.blockTimestampData,
            tokensData: simulationParams.tokensData,
          })
        : Promise.resolve(undefined);

    if (expressParams) {
      const [txnData] = await Promise.all([
        buildAndSignExpressBatchOrderTxn({
          chainId,
          signer,
          batchParams,
          relayParamsPayload: expressParams.relayParamsPayload,
          relayFeeParams: expressParams.relayFeeParams,
          subaccount: expressParams.subaccount,
        }),
        runSimulation().then(() => callback?.(eventBuilder.Simulated())),
      ]);

      callback?.(eventBuilder.Prepared());

      const createdAt = Date.now();

      const res = await withRetry(
        () =>
          sendExpressTransaction({
            chainId,
            txnData,
            isSponsoredCall: expressParams.isSponsoredCall,
          }),
        {
          retryCount: 3,
        }
      )
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
  params,
  blockTimestampData,
  tokensData,
}: {
  chainId: number;
  signer: Signer;
  params: BatchOrderTxnParams;
  blockTimestampData: BlockTimestampData | undefined;
  tokensData: TokensData;
}) => {
  const account = await signer.getAddress();

  const isInvalidReceiver = params.createOrderParams.some((co) => co.orderPayload.addresses.receiver !== account);

  if (isInvalidReceiver) {
    throw extendError(new Error(signerAddressError), {
      errorContext: "simulation",
    });
  }

  const isSimulationAllowed = params.createOrderParams.every((co) => !isLimitSwapOrderType(co.orderPayload.orderType));

  if (params.createOrderParams.length === 0 || !isSimulationAllowed) {
    return Promise.resolve();
  }

  const { encodedMulticall, value } = getBatchOrderMulticallPayload({
    params: {
      ...params,
      createOrderParams: [params.createOrderParams[0]],
    },
  });

  return simulateExecution(chainId, {
    account,
    prices: getSimulationPrices(chainId, tokensData, getOrdersTriggerPriceOverrides([params.createOrderParams[0]])),
    createMulticallPayload: encodedMulticall,
    value,
    blockTimestampData,
  });
};
