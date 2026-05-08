import type { Hex } from "viem";

import { getPublicClientWithRpc } from "lib/wallets/walletConfig";

export async function fetchLogsInTx(chainId: number, txHash: string) {
  const receipt = await getPublicClientWithRpc(chainId).waitForTransactionReceipt({
    hash: txHash as Hex,
  });

  return receipt.logs;
}
