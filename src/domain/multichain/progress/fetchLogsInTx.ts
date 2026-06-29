import { isHex } from "viem";

import { getPublicClientWithRpc } from "lib/wallets/walletConfig";

export async function fetchLogsInTx(chainId: number, txHash: string) {
  if (!isHex(txHash)) {
    throw new Error("Invalid transaction hash");
  }

  const receipt = await getPublicClientWithRpc(chainId).waitForTransactionReceipt({
    hash: txHash,
  });

  return receipt.logs;
}
