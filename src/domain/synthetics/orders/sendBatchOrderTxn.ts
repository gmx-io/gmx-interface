import { Signer } from "ethers";
import { PublicClient, withRetry } from "viem";

import { UiContractsChain, UiSettlementChain } from "config/chains";
import { ExpressParams } from "domain/synthetics/express";
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
  settlementChainClient,
  batchParams,
  expressParams,
  simulationParams,
  callback,
}: {
  chainId: UiContractsChain;
  signer: Signer;
  settlementChainClient?: PublicClient;
  batchParams: BatchOrderTxnParams;
  expressParams: ExpressParams | undefined;
  simulationParams: BatchSimulationParams | undefined;
  callback: TxnCallback<BatchOrderTxnCtx> | undefined;
}) {
  const srcChainId = await getMultichainInfoFromSigner(signer, chainId);
  const eventBuilder = new TxnEventBuilder<BatchOrderTxnCtx>({ expressParams, batchParams });

  try {
    const runSimulation = async () =>
      false
        ? makeBatchOrderSimulation({
            chainId,
            // TODO: implement simulation for multichain
            signer,
            params: batchParams,
            blockTimestampData: simulationParams.blockTimestampData,
            tokensData: simulationParams.tokensData,
          })
        : Promise.resolve(undefined);

    if (srcChainId && !expressParams) {
      throw new Error("Multichain orders are only supported with express params");
    }

    if (srcChainId && !settlementChainClient) {
      throw new Error("settlementChainClient is required");
    }

    if (expressParams) {
      const [txnData] = await Promise.all([
        buildAndSignExpressBatchOrderTxn({
          chainId: chainId as UiContractsChain,
          signer,
          settlementChainClient,
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
            isSponsoredCall: srcChainId ? false : expressParams.isSponsoredCall,
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
