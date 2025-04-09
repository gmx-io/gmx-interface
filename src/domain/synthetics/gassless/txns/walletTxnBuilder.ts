import { Contract, Signer } from "ethers";

import { getGasLimit, getGasPrice } from "lib/contracts";
import ExchangeRouter from "sdk/abis/ExchangeRouter.json";
import { getContract } from "sdk/configs/contracts";

import { collContract } from "components/Synthetics/TradeBox/hooks/callContract";
import { ErrorLike, extendError } from "lib/errors";
import { OrderMetricId } from "lib/metrics";
import { BlockTimestampData } from "lib/useBlockTimestampRequest";
import { TokensData } from "sdk/types/tokens";
import { BatchOrderTxnParams, getBatchOrderMulticallPayload } from "sdk/utils/orderTransactions";
import { isLimitSwapOrderType } from "sdk/utils/orders";
import { getOrdersTriggerPriceOverrides, getSimulationPrices, simulateExecution } from "./simulation";

export type OnPreparedParams = {};

export type OnSimulatedParams = {};

export type OnSentParams = {
  txnHash: string;
  metricId: OrderMetricId | undefined;
  blockNumber: bigint;
  createdAt: number;
};

export type OnErrorParams = {
  error: ErrorLike;
};

export type TxnCallbakcs = {
  onPrepared: (p: OnPreparedParams) => void;
  onSimulated: (p: OnSimulatedParams) => void;
  onSent: (p: OnSentParams) => void;
  onError: (p: OnErrorParams) => void;
};

export enum TxnEventName {
  TxnPrepared = "TxnPrepared",
  TxnSimulated = "TxnSimulated",
  TxnSent = "TxnSent",
  TxnError = "TxnError",
}

export type TxnPreparedEvent<TParams> = {
  event: TxnEventName.TxnPrepared;
  data: {
    params: TParams;
  };
};

export type TxnSimulatedEvent<TParams> = {
  event: TxnEventName.TxnSimulated;
  data: {
    params: TParams;
  };
};

export type TxnSentEvent<TParams> = {
  event: TxnEventName.TxnSent;
  data: {
    params: TParams;
    txnHash: string;
    blockNumber: bigint;
    createdAt: number;
  };
};

export type TxnErrorEvent<TParams> = {
  event: TxnEventName.TxnError;
  data: {
    params: TParams;
    error: ErrorLike;
  };
};

export type TxnEvent<TParams> =
  | TxnPreparedEvent<TParams>
  | TxnSimulatedEvent<TParams>
  | TxnSentEvent<TParams>
  | TxnErrorEvent<TParams>;

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

// export async function sendUpdateOrderTxn({
//   chainId,
//   signer,
//   params,
//   callback,
// }: {
//   chainId: number;
//   signer: Signer;
//   params: UpdateOrderTxnParams;
//   callback: TxnCallback | undefined;
// }) {
//   try {
//   } catch (error) {
//     callback?.({
//       event: TxnEventName.TxnError,
//       data: {
//         error,
//       },
//     });

//     throw error;
//   }
// }

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
  callback: TxnCallback<BatchOrderTxnParams> | undefined;
}) {
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
            event: TxnEventName.TxnSimulated,
            data: { params },
          });
        })
        .catch((error) => {
          throw extendError(error, {
            errorContext: "simulation",
          });
        }),
    ]);

    callback?.({
      event: TxnEventName.TxnPrepared,
      data: {
        params,
      },
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
          event: TxnEventName.TxnSent,
          data: {
            params,
            txnHash: res?.hash ?? "0x",
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
      event: TxnEventName.TxnError,
      data: {
        params,
        error,
      },
    });

    throw error;
  }
}
