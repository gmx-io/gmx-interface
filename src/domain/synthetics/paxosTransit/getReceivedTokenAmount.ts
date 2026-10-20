import { erc20Abi, isAddressEqual, parseEventLogs } from "viem";

import { getPublicClientWithRpc } from "lib/wallets/walletConfig";

// withdrawal execution events carry no output amounts, so they are read from the token transfers of the execution
export async function getReceivedTokenAmount(p: {
  chainId: number;
  txnHash: string;
  tokenAddress: string;
  account: string;
}): Promise<bigint> {
  const receipt = await getPublicClientWithRpc(p.chainId).getTransactionReceipt({ hash: p.txnHash });
  const transfers = parseEventLogs({ abi: erc20Abi, eventName: "Transfer", logs: receipt.logs });

  return transfers
    .filter(
      (transfer) => isAddressEqual(transfer.address, p.tokenAddress) && isAddressEqual(transfer.args.to, p.account)
    )
    .reduce((total, transfer) => total + transfer.args.value, 0n);
}
