import { erc20Abi, isAddressEqual, parseEventLogs } from "viem";

import type { ContractsChainId } from "config/chains";
import { parseEventLogData } from "context/WebsocketContext/subscribeToEvents";
import { getPublicClientWithRpc } from "lib/wallets/walletConfig";
import { abis } from "sdk/abis";
import { getContract } from "sdk/configs/contracts";

// withdrawal execution events carry no output amounts, so they are read from the token transfers of the execution
export async function getReceivedTokenAmount(p: {
  chainId: ContractsChainId;
  txnHash: string;
  tokenAddress: string;
  account: string;
  isGmxAccount?: boolean;
}): Promise<bigint> {
  // right after execution the first RPC can still miss the receipt, which would read as nothing received
  const receipt = await getPublicClientWithRpc(p.chainId).waitForTransactionReceipt({ hash: p.txnHash });

  // GMX Account payouts are credited in the multichain vault, which leaves no token transfer to the account
  if (p.isGmxAccount) {
    const eventEmitterAddress = getContract(p.chainId, "EventEmitter");

    return parseEventLogs({ abi: abis.EventEmitter, eventName: "EventLog1", logs: receipt.logs })
      .filter(
        (log) => isAddressEqual(log.address, eventEmitterAddress) && log.args.eventName === "MultichainTransferIn"
      )
      .map((log) => parseEventLogData(log.args.eventData))
      .filter(
        (data) =>
          isAddressEqual(data.addressItems.items.account, p.account) &&
          isAddressEqual(data.addressItems.items.token, p.tokenAddress)
      )
      .reduce((total, data) => total + data.uintItems.items.amount, 0n);
  }

  const transfers = parseEventLogs({ abi: erc20Abi, eventName: "Transfer", logs: receipt.logs });

  return transfers
    .filter(
      (transfer) => isAddressEqual(transfer.address, p.tokenAddress) && isAddressEqual(transfer.args.to, p.account)
    )
    .reduce((total, transfer) => total + transfer.args.value, 0n);
}
