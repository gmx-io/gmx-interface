import { MutableRefObject } from "react";
import {
  Abi,
  ContractEventArgs,
  DecodeEventLogReturnType,
  encodeAbiParameters,
  isAddress,
  keccak256,
  stringToBytes,
  zeroAddress,
} from "viem";
import type { ContractEventArgsFromTopics, ContractEventName } from "viem/_types/types/contract";

import { getContract, tryGetContract } from "config/contracts";
import type { EventLogData, EventTxnParams } from "context/SyntheticsEvents/types";
import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";
import { abis } from "sdk/abis";
import type { ContractsChainId, SourceChainId } from "sdk/configs/chains";
import { getTokens, NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";

type RawEventLogData = DecodeEventLogReturnType<typeof abis.EventEmitter, "EventLog2">["args"]["eventData"];

const hashId = (str: string) => keccak256(stringToBytes(str));

const encodeAddress = (address: string) => encodeAbiParameters([{ type: "address" }], [address]);

export const COMPOSE_DELIVERED_HASH = hashId("ComposeDelivered(address,address,bytes32,uint16)");
export const LZ_COMPOSE_ALERT_HASH = hashId(
  "LzComposeAlert(address,address,address,bytes32,uint16,uint256,uint256,bytes,bytes,bytes)"
);

export const OFT_SENT_ABI = [
  {
    inputs: [
      { indexed: true, internalType: "bytes32", name: "guid", type: "bytes32" },
      { indexed: false, internalType: "uint32", name: "dstEid", type: "uint32" },
      { indexed: true, internalType: "address", name: "fromAddress", type: "address" },
      { indexed: false, internalType: "uint256", name: "amountSentLD", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "amountReceivedLD", type: "uint256" },
    ],
    name: "OFTSent",
    type: "event",
  },
] as const satisfies Abi;

export const OFT_RECEIVED_ABI = [
  {
    inputs: [
      { indexed: true, internalType: "bytes32", name: "guid", type: "bytes32" },
      { indexed: false, internalType: "uint32", name: "srcEid", type: "uint32" },
      { indexed: true, internalType: "address", name: "toAddress", type: "address" },
      { indexed: false, internalType: "uint256", name: "amountReceivedLD", type: "uint256" },
    ],
    name: "OFTReceived",
    type: "event",
  },
] as const satisfies Abi;

export const COMPOSE_DELIVERED_ABI = [
  {
    inputs: [
      { indexed: false, internalType: "address", name: "from", type: "address" },
      { indexed: false, internalType: "address", name: "to", type: "address" },
      { indexed: false, internalType: "bytes32", name: "guid", type: "bytes32" },
      { indexed: false, internalType: "uint16", name: "index", type: "uint16" },
    ],
    name: "ComposeDelivered",
    type: "event",
  },
] as const satisfies Abi;

export const LZ_COMPOSE_ALERT_ABI = [
  {
    inputs: [
      { indexed: true, internalType: "address", name: "from", type: "address" },
      { indexed: true, internalType: "address", name: "to", type: "address" },
      { indexed: true, internalType: "address", name: "executor", type: "address" },
      { indexed: false, internalType: "bytes32", name: "guid", type: "bytes32" },
      { indexed: false, internalType: "uint16", name: "index", type: "uint16" },
      { indexed: false, internalType: "uint256", name: "gas", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "value", type: "uint256" },
      { indexed: false, internalType: "bytes", name: "message", type: "bytes" },
      { indexed: false, internalType: "bytes", name: "extraData", type: "bytes" },
      { indexed: false, internalType: "bytes", name: "reason", type: "bytes" },
    ],
    type: "event",
    name: "LzComposeAlert",
  },
] as const satisfies Abi;

export function subscribeToV2Events({
  chainId,
  account,
  eventLogHandlers,
}: {
  chainId: ContractsChainId;
  account: string;
  eventLogHandlers: MutableRefObject<
    Record<string, undefined | ((data: EventLogData, txnOpts: EventTxnParams) => void)>
  >;
}) {
  const client = getPublicClientWithRpc(chainId, { withWs: true });

  const filters = createV2EventFilters(account);
  const eventEmitterAddress = getContract(chainId, "EventEmitter");

  const unsubscribeEventLog1 = client.watchContractEvent({
    abi: abis.EventEmitter,
    address: eventEmitterAddress,
    eventName: filters.EventLog1.eventName,
    args: filters.EventLog1.args,
    onLogs: (logs) => {
      for (const log of logs) {
        const txnOpts: EventTxnParams = {
          transactionHash: log.transactionHash,
          blockNumber: Number(log.blockNumber),
        };

        try {
          eventLogHandlers.current[log.args.eventName]?.(parseEventLogData(log.args.eventData), txnOpts);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error("error parsing event", e);
        }
      }
    },
    strict: true,
  });

  const unsubscribeEventLog2 = client.watchContractEvent({
    abi: abis.EventEmitter,
    address: eventEmitterAddress,
    eventName: filters.EventLog2.eventName,
    args: filters.EventLog2.args,
    onLogs: (logs) => {
      for (const log of logs) {
        const txnOpts: EventTxnParams = {
          transactionHash: log.transactionHash,
          blockNumber: Number(log.blockNumber),
        };

        try {
          eventLogHandlers.current[log.args.eventName]?.(parseEventLogData(log.args.eventData), txnOpts);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error("error parsing event", e);
        }
      }
    },
    strict: true,
  });

  return () => {
    unsubscribeEventLog1();
    unsubscribeEventLog2();
  };
}

export function subscribeToTransferEvents({
  chainId,
  account,
  marketTokensAddresses,
  onTransfer,
}: {
  chainId: ContractsChainId;
  account: string;
  marketTokensAddresses: string[];
  onTransfer: (tokenAddress: string, amount: bigint) => void;
}) {
  const client = getPublicClientWithRpc(chainId, { withWs: true });

  const vaults = [
    tryGetContract(chainId, "OrderVault"),
    tryGetContract(chainId, "ShiftVault"),
    tryGetContract(chainId, "DepositVault"),
    tryGetContract(chainId, "WithdrawalVault"),
    tryGetContract(chainId, "GlvVault"),
  ].filter((v): v is string => Boolean(v));

  const senders = [zeroAddress, ...marketTokensAddresses];

  const tokenAddresses = getTokens(chainId)
    .filter((token) => !token.isSynthetic && isAddress(token.address) && token.address !== NATIVE_TOKEN_ADDRESS)
    .map((token) => token.address);
  const allTokenAddresses = [...marketTokensAddresses, ...tokenAddresses];

  const unsubscribeSend = client.watchContractEvent({
    abi: abis.Token,
    eventName: "Transfer",
    address: allTokenAddresses,
    args: {
      from: account,
      to: vaults,
    },
    onLogs: (logs) => {
      for (const log of logs) {
        const tokenAddress = log.address;
        const amount = log.args.value;
        onTransfer(tokenAddress, -amount);
      }
    },
    strict: true,
  });

  const unsubscribeReceive = client.watchContractEvent({
    abi: abis.Token,
    eventName: "Transfer",
    address: allTokenAddresses,
    args: {
      from: senders,
      to: account,
    },
    onLogs: (logs) => {
      for (const log of logs) {
        const tokenAddress = log.address;
        const amount = log.args.value;
        onTransfer(tokenAddress, amount);
      }
    },
    strict: true,
  });

  return () => {
    unsubscribeSend();
    unsubscribeReceive();
  };
}

export function subscribeToApprovalEvents({
  chainId,
  account,
  onApprove,
}: {
  chainId: ContractsChainId;
  account: string;
  onApprove: (tokenAddress: string, spender: string, value: bigint) => void;
}) {
  const client = getPublicClientWithRpc(chainId, { withWs: true });

  const spenders = [
    zeroAddress,
    tryGetContract(chainId, "StakedGmxTracker"),
    tryGetContract(chainId, "GlpManager"),
    tryGetContract(chainId, "SyntheticsRouter"),
    tryGetContract(chainId, "Router"),
  ].filter((s): s is string => Boolean(s));

  const tokenAddresses = getTokens(chainId)
    .filter((token) => isAddress(token.address) && token.address !== NATIVE_TOKEN_ADDRESS)
    .map((token) => token.address);

  const unsubscribe = client.watchContractEvent({
    abi: abis.Token,
    eventName: "Approval",
    address: tokenAddresses,
    args: {
      owner: account,
      spender: spenders,
    },
    onLogs: (logs) => {
      for (const log of logs) {
        const tokenAddress = log.address;
        const spender = log.args.spender;
        const value = log.args.value;
        onApprove(tokenAddress, spender, value);
      }
    },
    strict: true,
  });

  return () => {
    unsubscribe();
  };
}

export type OftSentInfo = {
  sender: string;
  txnHash: string;
} & ContractEventArgsFromTopics<typeof OFT_SENT_ABI, "OFTSent">;

export function subscribeToOftSentEvents({
  chainId,
  account,
  stargates,
  onOftSent,
}: {
  chainId: ContractsChainId | SourceChainId;
  account: string;
  stargates: string[];
  onOftSent: (info: OftSentInfo) => void;
}): () => void {
  const client = getPublicClientWithRpc(chainId, { withWs: true });

  const unsubscribe = client.watchContractEvent({
    abi: OFT_SENT_ABI,
    eventName: "OFTSent",
    address: stargates,
    args: {
      fromAddress: account,
    },
    onLogs: (logs) => {
      for (const log of logs) {
        onOftSent({
          sender: log.address,
          txnHash: log.transactionHash,
          ...log.args,
        });
      }
    },
    strict: true,
  });

  return () => {
    unsubscribe();
  };
}

export function subscribeToOftReceivedEvents({
  chainId,
  stargates,
  guids,
  onOftReceive,
}: {
  chainId: ContractsChainId | SourceChainId;
  stargates: string[];
  guids: string[];
  onOftReceive: (
    info: { sender: string; txnHash: string } & ContractEventArgsFromTopics<typeof OFT_RECEIVED_ABI, "OFTReceived">
  ) => void;
}) {
  if (guids.length === 0) {
    return undefined;
  }

  const client = getPublicClientWithRpc(chainId, { withWs: true });

  const unsubscribe = client.watchContractEvent({
    abi: OFT_RECEIVED_ABI,
    eventName: "OFTReceived",
    address: stargates,
    args: {
      guid: guids,
    },
    onLogs: (logs) => {
      for (const log of logs) {
        onOftReceive({
          sender: log.address,
          txnHash: log.transactionHash,
          ...log.args,
        });
      }
    },
    strict: true,
  });

  return () => {
    unsubscribe();
  };
}

export function subscribeToComposeDeliveredEvents({
  chainId,
  layerZeroEndpoint,
  guids,
  onComposeDelivered,
}: {
  chainId: ContractsChainId;
  layerZeroEndpoint: string;
  guids: string[];
  onComposeDelivered: (
    info: { sender: string; txnHash: string } & ContractEventArgsFromTopics<
      typeof COMPOSE_DELIVERED_ABI,
      "ComposeDelivered"
    >
  ) => void;
}) {
  if (guids.length === 0) {
    return undefined;
  }

  const client = getPublicClientWithRpc(chainId, { withWs: true });

  const unsubscribe = client.watchContractEvent({
    abi: COMPOSE_DELIVERED_ABI,
    eventName: "ComposeDelivered",
    address: layerZeroEndpoint,
    onLogs: (logs) => {
      for (const log of logs) {
        // Manual filtering because event params are not indexed
        if (!guids.includes(log.args.guid)) {
          continue;
        }

        onComposeDelivered({
          sender: log.address,
          txnHash: log.transactionHash,
          ...log.args,
        });
      }
    },
    strict: true,
  });

  return () => {
    unsubscribe();
  };
}

export function subscribeToMultichainApprovalEvents({
  srcChainId,
  account,
  tokenAddresses,
  spenders,
  onApprove,
}: {
  srcChainId: SourceChainId;
  account: string;
  tokenAddresses: string[];
  spenders: string[];
  onApprove: (tokenAddress: string, spender: string, value: bigint) => void;
}) {
  const client = getPublicClientWithRpc(srcChainId, { withWs: true });

  const unsubscribe = client.watchContractEvent({
    abi: abis.ERC20,
    eventName: "Approval",
    address: tokenAddresses,
    args: {
      owner: account,
      spender: spenders,
    },
    onLogs: (logs) => {
      for (const log of logs) {
        const tokenAddress = log.address;
        const spender = log.args.spender;
        const value = log.args.value;
        onApprove(tokenAddress, spender, value);
      }
    },
    strict: true,
  });

  return () => {
    unsubscribe();
  };
}

export function parseEventLogData(eventData: RawEventLogData): EventLogData {
  const ret: any = {};
  for (const typeKey of [
    "addressItems",
    "uintItems",
    "intItems",
    "boolItems",
    "bytes32Items",
    "bytesItems",
    "stringItems",
  ]) {
    ret[typeKey] = {};

    for (const listKey of ["items", "arrayItems"]) {
      ret[typeKey][listKey] = {};

      for (const item of eventData[typeKey][listKey]) {
        ret[typeKey][listKey][item.key] = item.value;
      }
    }
  }

  return ret as EventLogData;
}

type ViemEventFilter<abi extends Abi, eventName extends ContractEventName<abi> = ContractEventName<abi>> = {
  [key in eventName]: {
    eventName: key;
    args: ContractEventArgs<abi, key>;
  };
}[eventName];

function createV2EventFilters(account: string): {
  EventLog1: ViemEventFilter<typeof abis.EventEmitter, "EventLog1">;
  EventLog2: ViemEventFilter<typeof abis.EventEmitter, "EventLog2">;
} {
  const addressHash = encodeAddress(account);

  return {
    // POSITIONS AND MULTICHAIN - All EventLog1 with same topic1
    EventLog1: {
      eventName: "EventLog1",
      args: {
        eventNameHash: [
          "PositionIncrease",
          "PositionDecrease",

          "MultichainBridgeIn",
          "MultichainTransferOut",
          "MultichainTransferIn",
        ],
        topic1: addressHash,
      },
    },
    // DEPOSITS, WITHDRAWALS, SHIFTS, ORDERS, AND GLV - All EventLog2 with same topic1/topic2
    EventLog2: {
      eventName: "EventLog2",
      args: {
        eventNameHash: [
          "DepositCreated",
          "DepositCancelled",
          "DepositExecuted",

          "WithdrawalCreated",
          "WithdrawalCancelled",
          "WithdrawalExecuted",

          "ShiftCreated",
          "ShiftCancelled",
          "ShiftExecuted",

          "OrderCreated",
          "OrderCancelled",
          "OrderUpdated",
          "OrderExecuted",

          "GlvDepositCreated",
          "GlvDepositCancelled",
          "GlvDepositExecuted",

          "GlvWithdrawalCreated",
          "GlvWithdrawalExecuted",
          "GlvWithdrawalCancelled",
        ],
        topic1: null,
        topic2: addressHash,
      },
    },
  };
}

export function getTotalSubscribersEventsCount() {
  return 2;
}
