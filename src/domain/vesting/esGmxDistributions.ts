import { encodeAbiParameters, getAbiItem, isAddressEqual, type Address, type Hash } from "viem";

import type { ContractsChainId } from "config/chains";
import { getContract } from "config/contracts";
import type { RatioVestingConfig } from "config/vesting";
import { parseEventLogData } from "context/WebsocketContext/subscribeToEvents";
import { getPublicClientWithRpc } from "lib/wallets/walletConfig";
import { abis } from "sdk/abis";

export type EsGmxIssuerDistribution = {
  id: string;
  amount: bigint;
  epochId: bigint;
  batchIndex: bigint;
  timestamp: number;
  transactionHash: Hash;
};

export async function fetchEsGmxDistributions(
  chainId: ContractsChainId,
  account: string,
  config: RatioVestingConfig
): Promise<EsGmxIssuerDistribution[]> {
  const client = getPublicClientWithRpc(chainId);
  const logs = await client.getLogs({
    address: getContract(chainId, "EventEmitter"),
    event: getAbiItem({ abi: abis.EventEmitter, name: "EventLog1" }),
    args: {
      eventNameHash: "EsGmxIssued",
      topic1: encodeAbiParameters([{ type: "address" }], [account]),
    },
    fromBlock: config.issuerDeploymentBlock,
    toBlock: "latest",
    strict: true,
  });
  const distributions = logs.flatMap((log) => {
    if (
      log.removed ||
      log.blockHash === null ||
      log.transactionHash === null ||
      log.logIndex === null ||
      !isAddressEqual(log.args.msgSender as Address, config.issuer as Address) ||
      log.args.eventName !== "EsGmxIssued"
    ) {
      return [];
    }

    const eventData = parseEventLogData(log.args.eventData);
    const recipient = eventData.addressItems.items.account;
    if (!recipient || !isAddressEqual(recipient as Address, account as Address)) return [];

    const { amount, epochId, batchIndex } = eventData.uintItems.items;
    if (amount === undefined || epochId === undefined || batchIndex === undefined) {
      throw new Error("Incomplete esGMX distribution event");
    }

    return [
      {
        id: `esGmxIssuer-${log.transactionHash}-${log.logIndex}`,
        amount,
        epochId,
        batchIndex,
        transactionHash: log.transactionHash,
        blockHash: log.blockHash,
      },
    ];
  });
  const timestamps = new Map<Hash, number>();
  for (const blockHash of new Set(distributions.map((distribution) => distribution.blockHash))) {
    const block = await client.getBlock({ blockHash });
    timestamps.set(blockHash, Number(block.timestamp));
  }

  return distributions
    .map(({ blockHash, ...distribution }) => ({
      ...distribution,
      timestamp: timestamps.get(blockHash)!,
    }))
    .sort((a, b) => b.timestamp - a.timestamp);
}
