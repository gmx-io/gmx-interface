import { erc20Abi, isAddressEqual, type Log, parseEventLogs } from "viem";

import type { ContractsChainId } from "config/chains";
import { parseEventLogData } from "context/WebsocketContext/subscribeToEvents";
import { getPublicClientWithRpc } from "lib/wallets/walletConfig";
import { abis } from "sdk/abis";
import { getContract } from "sdk/configs/contracts";

export function getGmxAccountTransferInAmount(p: {
  chainId: ContractsChainId;
  logs: Log[];
  account: string;
  tokenAddress: string;
}): bigint {
  const eventEmitterAddress = getContract(p.chainId, "EventEmitter");

  return parseEventLogs({ abi: abis.EventEmitter, eventName: "EventLog1", logs: p.logs })
    .filter((log) => isAddressEqual(log.address, eventEmitterAddress) && log.args.eventName === "MultichainTransferIn")
    .map((log) => parseEventLogData(log.args.eventData))
    .filter(({ addressItems: { items } }) => {
      const { account, token } = items;

      return (
        account !== undefined &&
        token !== undefined &&
        isAddressEqual(account, p.account) &&
        isAddressEqual(token, p.tokenAddress)
      );
    })
    .reduce((total, data) => total + (data.uintItems.items.amount ?? 0n), 0n);
}

// withdrawal execution events carry no output amounts, so they are read from the token transfers of the execution
export async function getReceivedTokenAmount(p: {
  chainId: ContractsChainId;
  txnHash: string;
  tokenAddress: string;
  account: string;
  isGmxAccount?: boolean;
}): Promise<bigint> {
  const amounts = await getReceivedTokenAmounts({ ...p, tokenAddresses: [p.tokenAddress] });

  return amounts[p.tokenAddress];
}

export async function getReceivedTokenAmounts(p: {
  chainId: number;
  txnHash: string;
  tokenAddresses: string[];
  account: string;
}): Promise<Record<string, bigint>> {
  // right after execution the first RPC can still miss the receipt, which would read as nothing received
  const receipt = await getPublicClientWithRpc(p.chainId).waitForTransactionReceipt({ hash: p.txnHash });

  // GMX Account payouts are credited in the multichain vault, which leaves no token transfer to the account
  if (p.isGmxAccount) {
    return getGmxAccountTransferInAmount({ ...p, logs: receipt.logs });
  }

  const transfers = parseEventLogs({ abi: erc20Abi, eventName: "Transfer", logs: receipt.logs });

  return Object.fromEntries(
    p.tokenAddresses.map((tokenAddress) => [
      tokenAddress,
      transfers
        .filter(
          (transfer) => isAddressEqual(transfer.address, tokenAddress) && isAddressEqual(transfer.args.to, p.account)
        )
        .reduce((total, transfer) => total + transfer.args.value, 0n),
    ])
  );
}
