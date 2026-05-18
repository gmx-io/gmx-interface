import type { PublicClient } from "viem";

import type { SettlementChainId } from "config/chains";
import { TxnCallback, WalletTxnCtx, sendWalletTransaction } from "lib/transactions";
import type { WalletSigner } from "lib/wallets";
import { applyGasLimitBuffer } from "sdk/utils/gas/applyBuffer";
import { buildSameChainDepositTxn } from "sdk/utils/multichain/api";

export async function sendSameChainDepositTxn({
  chainId,
  signer,
  tokenAddress,
  amount,
  account,
  callback,
}: {
  chainId: SettlementChainId;
  signer: WalletSigner;
  tokenAddress: string;
  amount: bigint;
  account: string;
  callback?: TxnCallback<WalletTxnCtx>;
}) {
  const txn = buildSameChainDepositTxn({ chainId, tokenAddress, amount, account });

  await sendWalletTransaction({
    chainId,
    signer,
    to: txn.to,
    callData: txn.data,
    value: txn.value,
    callback,
  });
}

export async function estimateSameChainDepositGas({
  chainId,
  client,
  tokenAddress,
  amount,
  account,
}: {
  chainId: SettlementChainId;
  client: PublicClient;
  tokenAddress: string;
  amount: bigint;
  account: string;
}): Promise<bigint> {
  const txn = buildSameChainDepositTxn({ chainId, tokenAddress, amount, account });

  const gas = await client.estimateGas({
    account,
    to: txn.to,
    data: txn.data,
    value: txn.value,
  });

  return applyGasLimitBuffer(gas);
}
