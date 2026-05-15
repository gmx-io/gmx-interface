import { PublicClient } from "viem";

import type { SettlementChainId } from "config/chains";
import { sendWalletTransaction, TxnCallback, WalletTxnCtx } from "lib/transactions";
import type { WalletSigner } from "lib/wallets";
import { applyGasLimitBuffer } from "sdk/utils/gas/applyBuffer";
import { buildSameChainWithdrawTxn } from "sdk/utils/multichain/api";

import type { BridgeOutParams } from "./types";

export async function sendSameChainWithdrawalTxn({
  chainId,
  signer,
  bridgeOutParams,
  callback,
}: {
  chainId: SettlementChainId;
  signer: WalletSigner;
  bridgeOutParams: BridgeOutParams;
  callback?: TxnCallback<WalletTxnCtx>;
}) {
  const txn = buildSameChainWithdrawTxn({ chainId, bridgeOutParams });

  await sendWalletTransaction({
    chainId,
    signer,
    to: txn.to,
    callData: txn.data,
    value: txn.value,
    callback,
  });
}

export async function estimateSameChainWithdrawalGas({
  chainId,
  client,
  bridgeOutParams,
  account,
}: {
  chainId: SettlementChainId;
  client: PublicClient;
  bridgeOutParams: BridgeOutParams;
  account: string;
}): Promise<bigint> {
  const txn = buildSameChainWithdrawTxn({ chainId, bridgeOutParams });

  const gas = await client.estimateGas({
    account,
    to: txn.to as `0x${string}`,
    data: txn.data as `0x${string}`,
  });

  return applyGasLimitBuffer(gas);
}
