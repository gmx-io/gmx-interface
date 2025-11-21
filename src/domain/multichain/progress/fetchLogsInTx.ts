import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";

export async function fetchLogsInTx(chainId: number, txHash: string) {
  const receipt = await getPublicClientWithRpc(chainId).waitForTransactionReceipt({
    hash: txHash,
  });

  return receipt.logs;
}
