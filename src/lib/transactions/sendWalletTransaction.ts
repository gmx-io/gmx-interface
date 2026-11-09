import { isAddress, isHex, type Address, type Hex } from "viem";

import { extendError } from "lib/errors";
import { additionalTxnErrorValidation } from "lib/errors/additionalValidation";
import { GasPriceData, getGasPrice } from "lib/gas/gasPrice";
import { getProvider } from "lib/rpc";
import { getTenderlyConfig, simulateCallDataWithTenderly } from "lib/tenderly";
import { WalletSigner } from "lib/wallets";
import { getPublicClientWithRpc } from "lib/wallets/walletConfig";
import { applyGasLimitBuffer } from "sdk/utils/gas/applyBuffer";

import { ISigner, ISignerSendTransactionParams } from "./iSigner";
import { sendWalletCalls, type WalletCallsBatch } from "./sendWalletCalls";
import { TransactionWaiterResult, TxnCallback, TxnEventBuilder } from "./types";

export type WalletTxnCtx = {};

export type WalletTxnResult = {
  transactionHash: string | undefined;
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
  walletCallsBatch,
}: {
  chainId: number;
  signer: WalletSigner | ISigner;
  to: string;
  callData: string;
  value?: bigint;
  gasLimit?: bigint;
  gasPriceData?: GasPriceData;
  nonce?: number | bigint;
  /**
   * Comment for tenderly simulation
   */
  msg?: string;
  runSimulation?: () => Promise<void>;
  callback?: TxnCallback<WalletTxnCtx>;
  /** Sent in the same wallet confirmation, before this call; `runSimulation` has to account for them */
  walletCallsBatch?: WalletCallsBatch;
}): Promise<WalletTxnResult> {
  const from = signer.address;
  const eventBuilder = new TxnEventBuilder<WalletTxnCtx>({});

  try {
    const tenderlyConfig = getTenderlyConfig();

    if (tenderlyConfig) {
      await simulateCallDataWithTenderly({
        chainId,
        tenderlyConfig,
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

    if (walletCallsBatch) {
      await runSimulation?.().then(() => callback?.(eventBuilder.Simulated()));

      callback?.(eventBuilder.Sending());

      const { transactionHash } = await sendWalletCalls({
        chainId,
        account: from,
        calls: [...walletCallsBatch.calls, { to: to as Address, data: callData as Hex, value }],
        batch: walletCallsBatch,
      });

      callback?.(eventBuilder.Sent({ type: "wallet", transactionHash }));

      return { transactionHash, wait: makeWalletTxnResultWaiter(chainId, transactionHash as `0x${string}`) };
    }

    const gasLimitPromise = gasLimit
      ? Promise.resolve(gasLimit)
      : isAddress(from) && isAddress(to) && isHex(callData)
        ? getPublicClientWithRpc(chainId)
            .estimateGas({
              account: from,
              to,
              data: callData,
              value,
            })
            .then(applyGasLimitBuffer)
            .catch(() => undefined)
        : Promise.resolve(undefined);

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
      chainId,
      to,
      data: callData,
      value,
      from,
      nonce: nonce !== undefined ? Number(nonce) : undefined,
      gasLimit: gasLimitResult,
      ...(gasPriceDataResult ?? {}),
    };

    const res = await signer.sendTransaction(txnData).catch((error) => {
      additionalTxnErrorValidation(error, chainId, getProvider(undefined, chainId), txnData);

      throw extendError(error, {
        errorContext: "sending",
      });
    });

    if (!res.hash) {
      throw new Error("Transaction hash is not defined");
    }

    callback?.(
      eventBuilder.Sent({
        type: "wallet",
        transactionHash: res.hash,
      })
    );

    return {
      transactionHash: res.hash,
      wait: makeWalletTxnResultWaiter(chainId, res.hash as `0x${string}`),
    };
  } catch (error) {
    callback?.(eventBuilder.Error(error));

    throw error;
  }
}

function makeWalletTxnResultWaiter(chainId: number, hash: `0x${string}`): () => Promise<TransactionWaiterResult> {
  return async () => {
    const publicClient = getPublicClientWithRpc(chainId);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    return {
      transactionHash: hash,
      blockNumber: receipt.blockNumber !== undefined ? Number(receipt.blockNumber) : undefined,
      status: receipt.status === "success" ? "success" : "failed",
    };
  };
}
