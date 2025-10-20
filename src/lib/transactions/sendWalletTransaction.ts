import { extendError } from "lib/errors";
import { additionalTxnErrorValidation } from "lib/errors/additionalValidation";
import { estimateGasLimit } from "lib/gas/estimateGasLimit";
import { GasPriceData, getGasPrice } from "lib/gas/gasPrice";
import { getProvider } from "lib/rpc";
import { getTenderlyConfig, simulateCallDataWithTenderly } from "lib/tenderly";
import { WalletSigner } from "lib/wallets";

import { ISigner, ISignerSendTransactionParams, ISignerSendTransactionResult } from "./iSigner";
import { TransactionWaiterResult, TxnCallback, TxnEventBuilder } from "./types";

export type WalletTxnCtx = {};

export type WalletTxnResult = {
  transactionHash: string;
  wait: () => Promise<TransactionWaiterResult>;
};

export async function sendWalletTransaction({
  chainId,
  signer,
  to,
  callData,
  value,
  gasLimit,
  gasPriceData,
  runSimulation,
  nonce,
  msg,
  callback,
}: {
  chainId: number;
  signer: WalletSigner | ISigner;
  to: string;
  callData: string;
  value?: bigint;
  gasLimit?: bigint;
  gasPriceData?: GasPriceData;
  nonce?: number | bigint;
  msg?: string;
  runSimulation?: () => Promise<void>;
  callback?: TxnCallback<WalletTxnCtx>;
}) {
  const from = signer.address;
  const eventBuilder = new TxnEventBuilder<WalletTxnCtx>({});

  try {
    const tenderlyConfig = getTenderlyConfig();

    if (tenderlyConfig) {
      await simulateCallDataWithTenderly({
        chainId,
        tenderlyConfig,
        provider: signer.provider!,
        to,
        data: callData,
        from,
        value: value,
        gasLimit: gasLimit,
        gasPriceData: gasPriceData,
        blockNumber: undefined,
        comment: msg,
      });
      return {
        transactionHash: undefined,
        wait: async () => ({
          transactionHash: undefined,
          blockNumber: undefined,
          status: "success",
        }),
      };
    }

    const gasLimitPromise = gasLimit
      ? Promise.resolve(gasLimit)
      : estimateGasLimit(signer.provider!, {
          to,
          from,
          data: callData,
          value,
        }).catch(() => undefined);

    const provider = getProvider(undefined, chainId);
    const gasPriceDataPromise = gasPriceData
      ? Promise.resolve(gasPriceData)
      : getGasPrice(provider, chainId).catch(() => undefined);

    const [gasLimitResult, gasPriceDataResult] = await Promise.all([
      gasLimitPromise,
      gasPriceDataPromise,
      runSimulation?.().then(() => callback?.(eventBuilder.Simulated())),
    ]);

    callback?.(eventBuilder.Sending());

    const txnData: ISignerSendTransactionParams = {
      to,
      data: callData,
      value,
      from,
      nonce: nonce !== undefined ? Number(nonce) : undefined,
      gasLimit: gasLimitResult,
      ...(gasPriceDataResult ?? {}),
    };

    const res = await signer.sendTransaction(txnData).catch((error) => {
      additionalTxnErrorValidation(error, chainId, signer.provider!, txnData);

      throw extendError(error, {
        errorContext: "sending",
      });
    });

    callback?.(
      eventBuilder.Sent({
        type: "wallet",
        transactionHash: res.hash,
      })
    );

    return {
      transactionHash: res.hash,
      wait: makeWalletTxnResultWaiter(res.hash, res),
    };
  } catch (error) {
    callback?.(eventBuilder.Error(error));

    throw error;
  }
}

function makeWalletTxnResultWaiter(hash: string, txn: ISignerSendTransactionResult) {
  return async () => {
    const receipt = await txn.wait();
    return {
      transactionHash: hash,
      blockNumber: receipt?.blockNumber,
      status: receipt?.status === 1 ? "success" : "failed",
    };
  };
}
