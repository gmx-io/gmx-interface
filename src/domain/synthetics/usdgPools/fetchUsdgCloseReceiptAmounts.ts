import { erc20Abi, isAddressEqual, parseEventLogs } from "viem";

import type { ContractsChainId } from "config/chains";
import { parseEventLogData } from "context/WebsocketContext/subscribeToEvents";
import { getPublicClientWithRpc } from "lib/wallets/walletConfig";
import { abis } from "sdk/abis";
import { getContract } from "sdk/configs/contracts";

import type { UsdgCloseReceiptAmounts } from "./closePayout";

export async function fetchUsdgCloseReceiptAmounts({
  chainId,
  txnHash,
  account,
  orderKey,
  usdgAddress,
  lastSwapMarketAddress,
}: {
  chainId: ContractsChainId;
  txnHash: string;
  account: string;
  orderKey: string;
  usdgAddress: string;
  lastSwapMarketAddress: string | undefined;
}): Promise<UsdgCloseReceiptAmounts> {
  // right after execution the first RPC can still miss the receipt
  const { logs } = await getPublicClientWithRpc(chainId).waitForTransactionReceipt({ hash: txnHash });
  const eventEmitterAddress = getContract(chainId, "EventEmitter");

  const events = parseEventLogs({ abi: abis.EventEmitter, eventName: "EventLog1", logs })
    .filter((log) => isAddressEqual(log.address, eventEmitterAddress))
    .map((log) => ({ name: log.args.eventName, data: parseEventLogData(log.args.eventData) }));

  // the swap is rolled back with its SwapInfo when it can't fill; its amountOut also covers native ETH and
  // GMX Account payouts, which leave no token transfer to the account
  const lastSwapLeg =
    lastSwapMarketAddress === undefined
      ? undefined
      : events.find(
          ({ name, data }) =>
            name === "SwapInfo" &&
            data.bytes32Items.items.orderKey === orderKey &&
            isAddressEqual(data.addressItems.items.market, lastSwapMarketAddress)
        );

  const usdgToWallet = parseEventLogs({ abi: erc20Abi, eventName: "Transfer", logs })
    .filter((transfer) => isAddressEqual(transfer.address, usdgAddress) && isAddressEqual(transfer.args.to, account))
    .reduce((total, transfer) => total + transfer.args.value, 0n);

  const usdgToGmxAccount = events
    .filter(
      ({ name, data }) =>
        name === "MultichainTransferIn" &&
        isAddressEqual(data.addressItems.items.account, account) &&
        isAddressEqual(data.addressItems.items.token, usdgAddress)
    )
    .reduce((total, { data }) => total + data.uintItems.items.amount, 0n);

  return {
    swapOutputAmount: lastSwapLeg?.data.uintItems.items.amountOut,
    usdgAmount: usdgToWallet + usdgToGmxAccount,
  };
}
