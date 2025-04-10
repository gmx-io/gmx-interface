import { Contract, Signer } from "ethers";

import { getGasLimit, getGasPrice } from "lib/contracts";
import ExchangeRouter from "sdk/abis/ExchangeRouter.json";
import { getContract } from "sdk/configs/contracts";

import { collContract } from "components/Synthetics/TradeBox/hooks/callContract";
import { ErrorLike, extendError } from "lib/errors";
import { BlockTimestampData } from "lib/useBlockTimestampRequest";
import { TokensData } from "sdk/types/tokens";
import { BatchOrderTxnParams, getBatchOrderMulticallPayload } from "sdk/utils/orderTransactions";
import { isLimitSwapOrderType } from "sdk/utils/orders";
import { zeroHash } from "viem";
import { getOrdersTriggerPriceOverrides, getSimulationPrices, simulateExecution } from "./simulation";

export enum TxnEventName {
  TxnPrepared = "TxnPrepared",
  TxnSimulated = "TxnSimulated",
  TxnSent = "TxnSent",
  TxnError = "TxnError",
}

export enum TxnMode {
  Wallet = "wallet",
  Express = "express",
  Subaccount = "subaccount",
}

export type TxnPreparedEvent = {
  event: TxnEventName.TxnPrepared;
  data: {};
};

export type TxnSimulatedEvent = {
  event: TxnEventName.TxnSimulated;
  data: {};
};

export type TxnSentEvent = {
  event: TxnEventName.TxnSent;
  data: {
    txnHash: string;
    blockNumber: bigint;
    createdAt: number;
  };
};

export type TxnErrorEvent = {
  event: TxnEventName.TxnError;
  data: {
    error: ErrorLike;
  };
};

export type BaseTxnEvent = TxnPreparedEvent | TxnSimulatedEvent | TxnSentEvent | TxnErrorEvent;
export type BatchOrderTxnEventParams = {
  type: "batchOrder";
  mode: "wallet" | "express" | "subaccount";
  chainId: number;
  signer: Signer;
  params: BatchOrderTxnParams;
};

export type TxnEvent<TxnParams> = BaseTxnEvent & { txnParams: TxnParams };

export type TxnCallback<TParams> = (event: TxnEvent<TParams>) => void;

export const makeSimulation =
  ({
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
  }) =>
  async () => {
    const primaryOrderParams = params.createOrderParams[0];

    if (!primaryOrderParams) {
      throw new Error("No primary order params");
    }

    const isSimulationAllowed = primaryOrderParams && !isLimitSwapOrderType(primaryOrderParams.orderPayload.orderType);

    if (!isSimulationAllowed) {
      return;
    }

    const prices = getSimulationPrices(chainId, tokensData, getOrdersTriggerPriceOverrides(params.createOrderParams));

    const { callData, value } = getBatchOrderMulticallPayload({ chainId, params });

    return simulateExecution(chainId, {
      account: await signer.getAddress(),
      prices,
      createMulticallPayload: callData,
      blockTimestampData,
      value,
    });
  };

export async function sendBatchOrderWalletTxn({
  chainId,
  signer,
  params,
  simulation,
  callback,
}: {
  chainId: number;
  signer: Signer;
  params: BatchOrderTxnParams;
  simulation: () => Promise<void> | undefined;
  callback: TxnCallback<BatchOrderTxnEventParams> | undefined;
}) {
  const baseEventParams: BatchOrderTxnEventParams = {
    type: "batchOrder",
    mode: "wallet",
    chainId,
    signer,
    params,
  };

  try {
    const { callData, value } = getBatchOrderMulticallPayload({ chainId, params });
    const routerAddress = getContract(chainId, "ExchangeRouter");
    const contract = new Contract(routerAddress, ExchangeRouter.abi, signer);

    const [gasLimit, gasPriceData] = await Promise.all([
      getGasLimit(contract, "multicall", [callData], value).catch((error) => {
        throw extendError(error, {
          errorContext: "gasLimit",
        });
      }),
      getGasPrice(contract.runner!.provider!, chainId).catch((error) => {
        throw extendError(error, {
          errorContext: "gasPrice",
        });
      }),
      simulation?.()
        ?.then(() => {
          callback?.({
            txnParams: baseEventParams,
            event: TxnEventName.TxnSimulated,
            data: {},
          });
        })
        .catch((error) => {
          throw extendError(error, {
            errorContext: "simulation",
          });
        }),
    ]);

    callback?.({
      txnParams: baseEventParams,
      event: TxnEventName.TxnPrepared,
      data: {},
    });

    const createdAt = Date.now();

    await collContract(chainId, contract, "multicall", [callData], {
      value,
      hideSentMsg: true,
      hideSuccessMsg: true,
      gasLimit,
      gasPriceData,
    })
      .then((res) => {
        callback?.({
          txnParams: baseEventParams,
          event: TxnEventName.TxnSent,
          data: {
            txnHash: res?.hash ?? zeroHash,
            blockNumber: res?.blockNumber ?? 0n,
            createdAt,
          },
        });
      })
      .catch((error) => {
        throw extendError(error, {
          errorContext: "sending",
        });
      });
  } catch (error) {
    callback?.({
      txnParams: baseEventParams,
      event: TxnEventName.TxnError,
      data: {
        error,
      },
    });

    throw error;
  }
}
