import { Contract, Signer } from "ethers";
import { zeroHash } from "viem";

import { PendingExpressTxnParams } from "context/SyntheticsEvents";
import { getGasLimit, getGasPrice } from "lib/contracts";
import { ErrorLike, extendError } from "lib/errors";
import { BlockTimestampData } from "lib/useBlockTimestampRequest";
import ExchangeRouter from "sdk/abis/ExchangeRouter.json";
import { getContract } from "sdk/configs/contracts";
import { TokensData } from "sdk/types/tokens";
import { isLimitSwapOrderType } from "sdk/utils/orders";
import { BatchOrderTxnParams, getBatchOrderMulticallPayload } from "sdk/utils/orderTransactions";

import { collContract } from "components/Synthetics/TradeBox/hooks/callContract";

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
  pendingExpressTxnParams: PendingExpressTxnParams | undefined;
  params: BatchOrderTxnParams;
};

export type TxnEvent<TxnParams> = BaseTxnEvent & { txnParams: TxnParams };

export type TxnCallback<TParams> = (event: TxnEvent<TParams>) => void;

export type SimulationParams = {
  tokensData: TokensData;
  blockTimestampData: BlockTimestampData | undefined;
};

export const makeBatchOrderSimulation = ({
  chainId,
  account,
  params,
  blockTimestampData,
  tokensData,
}: {
  chainId: number;
  account: string;
  params: BatchOrderTxnParams;
  blockTimestampData: BlockTimestampData | undefined;
  tokensData: TokensData;
}) => {
  const isSimulationAllowed = params.createOrderParams.every((co) => !isLimitSwapOrderType(co.orderPayload.orderType));

  if (!isSimulationAllowed || params.createOrderParams.length === 0) {
    return Promise.resolve();
  }

  const { callData, value } = getBatchOrderMulticallPayload({
    chainId,
    params: {
      ...params,
      createOrderParams: [params.createOrderParams[0]],
    },
  });

  return simulateExecution(chainId, {
    account,
    prices: getSimulationPrices(chainId, tokensData, getOrdersTriggerPriceOverrides([params.createOrderParams[0]])),
    createMulticallPayload: callData,
    value,
    blockTimestampData,
  });
};

export async function sendBatchOrderWalletTxn({
  chainId,
  signer,
  params,
  simulationParams,
  callback,
}: {
  chainId: number;
  signer: Signer;
  params: BatchOrderTxnParams;
  simulationParams: SimulationParams | undefined;
  callback: TxnCallback<BatchOrderTxnEventParams> | undefined;
}) {
  const baseEventParams: BatchOrderTxnEventParams = {
    type: "batchOrder",
    mode: "wallet",
    chainId,
    signer,
    pendingExpressTxnParams: undefined,
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
      simulationParams
        ? makeBatchOrderSimulation({
            chainId,
            account: await signer.getAddress(),
            params,
            blockTimestampData: simulationParams.blockTimestampData,
            tokensData: simulationParams.tokensData,
          })
            .then(() => {
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
            })
        : Promise.resolve(),
    ]);

    callback?.({
      txnParams: baseEventParams,
      event: TxnEventName.TxnPrepared,
      data: {},
    });

    const createdAt = Date.now();

    return collContract(chainId, contract, "multicall", [callData], {
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

        return res;
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
