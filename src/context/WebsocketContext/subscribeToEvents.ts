import { AbiCoder, Contract, ethers, isAddress, LogParams, Provider, ProviderEvent, ZeroAddress } from "ethers";
import { MutableRefObject } from "react";
import { Abi, ContractEventArgsFromTopics, decodeEventLog, Hex } from "viem";

import { getContract, tryGetContract } from "config/contracts";
import type { EventLogData, EventTxnParams } from "context/SyntheticsEvents/types";
import { abis } from "sdk/abis";
import type { ContractsChainId } from "sdk/configs/chains";
import { getTokens, NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";

const coder = AbiCoder.defaultAbiCoder();

const vaultEvents = {
  UpdatePosition: "onUpdatePosition",
  ClosePosition: "onClosePosition",
  IncreasePosition: "onIncreasePosition",
  DecreasePosition: "onDecreasePosition",
} as const;

const positionRouterEvents = {
  CancelIncreasePosition: "onCancelIncreasePosition",
  CancelDecreasePosition: "onCancelDecreasePosition",
} as const;

export function subscribeToV1Events(
  wsVault: Contract,
  wsPositionRouter: Contract,
  callExchangeRef: (method: any, ...args: any[]) => void
) {
  const unsubs: (() => void)[] = [];

  Object.keys(vaultEvents).forEach((eventName) => {
    const handlerName = vaultEvents[eventName];
    const handler = (...args) => callExchangeRef(handlerName, ...args);
    wsVault.on(eventName, handler);
    unsubs.push(() => wsVault.off(eventName, handler));
  });

  Object.keys(positionRouterEvents).forEach((eventName) => {
    const handlerName = positionRouterEvents[eventName];
    const handler = (...args) => callExchangeRef(handlerName, ...args);
    wsPositionRouter.on(eventName, handler);
    unsubs.push(() => wsPositionRouter.off(eventName, handler));
  });

  return () => {
    unsubs.forEach((unsub) => unsub());
  };
}

const DEPOSIT_CREATED_HASH = ethers.id("DepositCreated");
const DEPOSIT_EXECUTED_HASH = ethers.id("DepositExecuted");
const DEPOSIT_CANCELLED_HASH = ethers.id("DepositCancelled");

const WITHDRAWAL_CREATED_HASH = ethers.id("WithdrawalCreated");
const WITHDRAWAL_EXECUTED_HASH = ethers.id("WithdrawalExecuted");
const WITHDRAWAL_CANCELLED_HASH = ethers.id("WithdrawalCancelled");

const SHIFT_CREATED_HASH = ethers.id("ShiftCreated");
const SHIFT_EXECUTED_HASH = ethers.id("ShiftExecuted");
const SHIFT_CANCELLED_HASH = ethers.id("ShiftCancelled");

const ORDER_CREATED_HASH = ethers.id("OrderCreated");
const ORDER_EXECUTED_HASH = ethers.id("OrderExecuted");
const ORDER_CANCELLED_HASH = ethers.id("OrderCancelled");
const ORDER_UPDATED_HASH = ethers.id("OrderUpdated");

const POSITION_INCREASE_HASH = ethers.id("PositionIncrease");
const POSITION_DECREASE_HASH = ethers.id("PositionDecrease");

const GLV_DEPOSIT_CREATED_HASH = ethers.id("GlvDepositCreated");
const GLV_DEPOSIT_EXECUTED_HASH = ethers.id("GlvDepositExecuted");
const GLV_DEPOSIT_CANCELLED_HASH = ethers.id("GlvDepositCancelled");

const GLV_WITHDRAWAL_CREATED_HASH = ethers.id("GlvWithdrawalCreated");
const GLV_WITHDRAWAL_EXECUTED_HASH = ethers.id("GlvWithdrawalExecuted");
const GLV_WITHDRAWAL_CANCELLED_HASH = ethers.id("GlvWithdrawalCancelled");

const APPROVED_HASH = ethers.id("Approval(address,address,uint256)");
const TRANSFER_HASH = ethers.id("Transfer(address,address,uint256)");

const MULTICHAIN_BRIDGE_IN_HASH = ethers.id("MultichainBridgeIn");

const OFT_SENT_HASH = ethers.id("OFTSent(bytes32,uint32,address,uint256,uint256)");
const OFT_RECEIVED_HASH = ethers.id("OFTReceived(bytes32,uint32,address,uint256)");
const COMPOSE_DELIVERED_HASH = ethers.id("ComposeDelivered(address,address,bytes32,uint16)");

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

export function subscribeToV2Events(
  chainId: ContractsChainId,
  provider: Provider,
  account: string,
  eventLogHandlers: MutableRefObject<
    Record<string, undefined | ((data: EventLogData, txnOpts: EventTxnParams) => void)>
  >
) {
  const eventEmitter = new ethers.Contract(getContract(chainId, "EventEmitter"), abis.EventEmitter, provider);

  function handleEventLog(sender, eventName, eventNameHash, eventData, txnOpts) {
    eventLogHandlers.current[eventName]?.(parseEventLogData(eventData), txnOpts);
  }

  function handleEventLog1(sender, eventName, eventNameHash, topic1, eventData, txnOpts) {
    eventLogHandlers.current[eventName]?.(parseEventLogData(eventData), txnOpts);
  }

  function handleEventLog2(msgSender, eventName, eventNameHash, topic1, topic2, eventData, txnOpts) {
    eventLogHandlers.current[eventName]?.(parseEventLogData(eventData), txnOpts);
  }

  function handleCommonLog(e) {
    const txnOpts: EventTxnParams = {
      transactionHash: e.transactionHash,
      blockNumber: e.blockNumber,
    };

    try {
      const parsed = eventEmitter.interface.parseLog(e);

      if (!parsed) throw new Error("Could not parse event");
      if (parsed.name === "EventLog") {
        handleEventLog(parsed.args[0], parsed.args[1], parsed.args[2], parsed.args[3], txnOpts);
      } else if (parsed.name === "EventLog1") {
        handleEventLog1(parsed.args[0], parsed.args[1], parsed.args[2], parsed.args[3], parsed.args[4], txnOpts);
      } else if (parsed.name === "EventLog2") {
        handleEventLog2(
          parsed.args[0],
          parsed.args[1],
          parsed.args[2],
          parsed.args[3],
          parsed.args[4],
          parsed.args[5],
          txnOpts
        );
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("error parsing event", e);
    }
  }

  const filters: ProviderEvent[] = createV2EventFilters(chainId, account, provider);

  filters.forEach((filter) => {
    provider.on(filter, handleCommonLog);
  });

  return () => {
    filters.forEach((filter) => {
      provider.off(filter, handleCommonLog);
    });
  };
}

export function subscribeToTransferEvents(
  chainId: ContractsChainId,
  provider: Provider,
  account: string,
  marketTokensAddresses: string[],
  onTransfer: (tokenAddress: string, amount: bigint) => void
) {
  const vaults = [
    tryGetContract(chainId, "OrderVault"),
    tryGetContract(chainId, "ShiftVault"),
    tryGetContract(chainId, "DepositVault"),
    tryGetContract(chainId, "WithdrawalVault"),
    tryGetContract(chainId, "GlvVault"),
  ].filter(Boolean);
  const vaultHashes = vaults.map((vault) => coder.encode(["address"], [vault]));

  const senderHashes = [ZeroAddress, ...marketTokensAddresses].map((address) => coder.encode(["address"], [address]));

  const accountHash = coder.encode(["address"], [account]);

  const tokenAddresses = getTokens(chainId)
    .filter((token) => !token.isSynthetic && isAddress(token.address) && token.address !== NATIVE_TOKEN_ADDRESS)
    .map((token) => token.address);
  const allTokenAddresses = [...marketTokensAddresses, ...tokenAddresses];

  const tokenContract = new ethers.Contract(ZeroAddress, abis.Token, provider);

  const sendFilters: ProviderEvent = {
    address: allTokenAddresses,
    topics: [TRANSFER_HASH, accountHash, vaultHashes],
  };

  const receiveFilters: ProviderEvent = {
    address: allTokenAddresses,
    topics: [TRANSFER_HASH, senderHashes, accountHash],
  };

  const handleSend = (log: LogParams) => {
    const tokenAddress = log.address;
    const data = tokenContract.interface.parseLog(log);

    if (!data) {
      return;
    }

    const amount = BigInt(data.args[2]);

    onTransfer(tokenAddress, -amount);
  };

  const handleReceive = (log: LogParams) => {
    const tokenAddress = log.address;
    const data = tokenContract.interface.parseLog(log);

    if (!data) {
      return;
    }

    const amount = BigInt(data.args[2]);

    onTransfer(tokenAddress, amount);
  };

  provider.on(sendFilters, handleSend);
  provider.on(receiveFilters, handleReceive);

  return () => {
    provider.off(sendFilters, handleSend);
    provider.off(receiveFilters, handleReceive);
  };
}

export function subscribeToApprovalEvents(
  chainId: ContractsChainId,
  provider: Provider,
  account: string,
  onApprove: (tokenAddress: string, spender: string, value: bigint) => void
) {
  const spenders = [
    ZeroAddress,
    tryGetContract(chainId, "StakedGmxTracker"),
    tryGetContract(chainId, "GlpManager"),
    tryGetContract(chainId, "SyntheticsRouter"),
    tryGetContract(chainId, "Router"),
  ].filter(Boolean);

  const spenderTopics = spenders.map((spender) => AbiCoder.defaultAbiCoder().encode(["address"], [spender]));
  const addressHash = AbiCoder.defaultAbiCoder().encode(["address"], [account]);
  const tokenAddresses = getTokens(chainId)
    .filter((token) => isAddress(token.address) && token.address !== NATIVE_TOKEN_ADDRESS)
    .map((token) => token.address);

  const approvalsFilter: ProviderEvent = {
    address: tokenAddresses,
    topics: [APPROVED_HASH, addressHash, spenderTopics],
  };

  const handleApprovalsLog = (log: LogParams) => {
    const tokenAddress = log.address;
    const spender = ethers.AbiCoder.defaultAbiCoder().decode(["address"], log.topics[2])[0];
    const value = ethers.AbiCoder.defaultAbiCoder().decode(["uint256"], log.data)[0];

    onApprove(tokenAddress, spender, value);
  };

  provider.on(approvalsFilter, handleApprovalsLog);

  return () => {
    provider.off(approvalsFilter, handleApprovalsLog);
  };
}

export function subscribeToOftSentEvents(
  provider: Provider,
  account: string,
  stargates: string[],
  onOftSent: (
    info: {
      sender: string;
      txnHash: string;
    } & ContractEventArgsFromTopics<typeof OFT_SENT_ABI, "OFTSent">
  ) => void
): () => void {
  const addressHash = AbiCoder.defaultAbiCoder().encode(["address"], [account]);

  const providerFilter: ProviderEvent = {
    address: stargates,
    topics: [OFT_SENT_HASH, null, addressHash],
  };

  const handleOftSentLog = (log: LogParams) => {
    const args = decodeEventLog({
      abi: OFT_SENT_ABI,
      eventName: "OFTSent",
      topics: log.topics as any,
      data: log.data as Hex,
    }).args;

    onOftSent({
      sender: log.address,
      txnHash: log.transactionHash,
      ...args,
    });
  };

  provider.on(providerFilter, handleOftSentLog);

  return () => {
    provider.off(providerFilter, handleOftSentLog);
  };
}

export function subscribeToOftReceivedEvents(
  provider: Provider,
  stargates: string[],
  guids: string[],
  onOftReceive: (
    info: { sender: string; txnHash: string } & ContractEventArgsFromTopics<typeof OFT_RECEIVED_ABI, "OFTReceived">
  ) => void
) {
  if (guids.length === 0) {
    return undefined;
  }

  const providerFilter: ProviderEvent = {
    address: stargates,
    topics: [OFT_RECEIVED_HASH, guids, null],
  };

  const handleOftReceivedLog = (log: LogParams) => {
    const args = decodeEventLog({
      abi: OFT_RECEIVED_ABI,
      eventName: "OFTReceived",
      topics: log.topics as any,
      data: log.data as Hex,
    }).args;

    onOftReceive({
      sender: log.address,
      txnHash: log.transactionHash,
      ...args,
    });
  };

  provider.on(providerFilter, handleOftReceivedLog);

  return () => {
    provider.off(providerFilter, handleOftReceivedLog);
  };
}

export function subscribeToComposeDeliveredEvents(
  provider: Provider,
  layerZeroEndpoint: string,
  guids: string[],
  onComposeDelivered: (
    info: { sender: string; txnHash: string } & ContractEventArgsFromTopics<
      typeof COMPOSE_DELIVERED_ABI,
      "ComposeDelivered"
    >
  ) => void
) {
  if (guids.length === 0) {
    return undefined;
  }

  const providerFilter: ProviderEvent = {
    address: layerZeroEndpoint,
    topics: [COMPOSE_DELIVERED_HASH],
  };

  const handleComposeDeliveredLog = (log: LogParams) => {
    const args = decodeEventLog({
      abi: COMPOSE_DELIVERED_ABI,
      eventName: "ComposeDelivered",
      topics: log.topics as any,
      data: log.data as Hex,
    }).args;

    // Manual filtering because event params are not indexed
    if (!guids.includes(args.guid)) {
      return;
    }

    onComposeDelivered({
      sender: log.address,
      txnHash: log.transactionHash,
      ...args,
    });
  };

  provider.on(providerFilter, handleComposeDeliveredLog);

  return () => {
    provider.off(providerFilter, handleComposeDeliveredLog);
  };
}

export function subscribeToMultichainApprovalEvents(
  provider: Provider,
  account: string,
  tokenAddresses: string[],
  spenders: string[],
  onApprove: (tokenAddress: string, spender: string, value: bigint) => void
) {
  const spenderTopics = spenders.map((spender) => AbiCoder.defaultAbiCoder().encode(["address"], [spender]));
  const addressHash = AbiCoder.defaultAbiCoder().encode(["address"], [account]);

  const approvalsFilter: ProviderEvent = {
    address: tokenAddresses,
    topics: [APPROVED_HASH, addressHash, spenderTopics],
  };

  const handleApprovalsLog = (log: LogParams) => {
    const tokenAddress = log.address;
    const spender = ethers.AbiCoder.defaultAbiCoder().decode(["address"], log.topics[2])[0];
    const value = ethers.AbiCoder.defaultAbiCoder().decode(["uint256"], log.data)[0];
    onApprove(tokenAddress, spender, value);
  };

  provider.on(approvalsFilter, handleApprovalsLog);

  return () => {
    provider.off(approvalsFilter, handleApprovalsLog);
  };
}

function parseEventLogData(eventData): EventLogData {
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

function createV2EventFilters(chainId: ContractsChainId, account: string, wsProvider: Provider): ProviderEvent[] {
  const addressHash = AbiCoder.defaultAbiCoder().encode(["address"], [account]);
  const eventEmitter = new ethers.Contract(getContract(chainId, "EventEmitter"), abis.EventEmitter, wsProvider);
  const EVENT_LOG_TOPIC = eventEmitter.interface.getEvent("EventLog")?.topicHash ?? null;
  const EVENT_LOG1_TOPIC = eventEmitter.interface.getEvent("EventLog1")?.topicHash ?? null;
  const EVENT_LOG2_TOPIC = eventEmitter.interface.getEvent("EventLog2")?.topicHash ?? null;

  const GLV_TOPICS_FILTER = [
    GLV_DEPOSIT_CREATED_HASH,
    GLV_DEPOSIT_CANCELLED_HASH,
    GLV_DEPOSIT_EXECUTED_HASH,
    GLV_WITHDRAWAL_CREATED_HASH,
    GLV_WITHDRAWAL_EXECUTED_HASH,
    GLV_WITHDRAWAL_CANCELLED_HASH,
  ];

  return [
    // DEPOSITS AND WITHDRAWALS AND SHIFTS
    {
      address: getContract(chainId, "EventEmitter"),
      topics: [
        EVENT_LOG2_TOPIC,
        [DEPOSIT_CREATED_HASH, WITHDRAWAL_CREATED_HASH, SHIFT_CREATED_HASH],
        null,
        addressHash,
      ],
    },
    {
      address: getContract(chainId, "EventEmitter"),
      topics: [
        EVENT_LOG_TOPIC,
        [DEPOSIT_CANCELLED_HASH, DEPOSIT_EXECUTED_HASH, WITHDRAWAL_CANCELLED_HASH, WITHDRAWAL_EXECUTED_HASH],
      ],
    },
    // NEW CONTRACTS
    {
      address: getContract(chainId, "EventEmitter"),
      topics: [
        EVENT_LOG2_TOPIC,
        [
          DEPOSIT_CANCELLED_HASH,
          DEPOSIT_EXECUTED_HASH,

          WITHDRAWAL_CANCELLED_HASH,
          WITHDRAWAL_EXECUTED_HASH,

          SHIFT_CANCELLED_HASH,
          SHIFT_EXECUTED_HASH,
        ],
        null,
        addressHash,
      ],
    },
    // ORDERS
    {
      address: getContract(chainId, "EventEmitter"),
      topics: [EVENT_LOG2_TOPIC, ORDER_CREATED_HASH, null, addressHash],
    },
    {
      address: getContract(chainId, "EventEmitter"),
      topics: [EVENT_LOG1_TOPIC, [ORDER_CANCELLED_HASH, ORDER_UPDATED_HASH, ORDER_EXECUTED_HASH]],
    },
    // NEW CONTRACTS
    {
      address: getContract(chainId, "EventEmitter"),
      topics: [EVENT_LOG2_TOPIC, [ORDER_CANCELLED_HASH, ORDER_UPDATED_HASH, ORDER_EXECUTED_HASH], null, addressHash],
    },
    // POSITIONS
    {
      address: getContract(chainId, "EventEmitter"),
      topics: [EVENT_LOG1_TOPIC, [POSITION_INCREASE_HASH, POSITION_DECREASE_HASH], addressHash],
    },
    // GLV DEPOSITS
    {
      address: getContract(chainId, "EventEmitter"),
      topics: [EVENT_LOG_TOPIC, GLV_TOPICS_FILTER, null, addressHash],
    },
    {
      address: getContract(chainId, "EventEmitter"),
      topics: [EVENT_LOG1_TOPIC, GLV_TOPICS_FILTER, null, addressHash],
    },
    {
      address: getContract(chainId, "EventEmitter"),
      topics: [EVENT_LOG2_TOPIC, GLV_TOPICS_FILTER, null, addressHash],
    },
    // Multichain
    {
      address: getContract(chainId, "EventEmitter"),
      topics: [EVENT_LOG1_TOPIC, [MULTICHAIN_BRIDGE_IN_HASH], addressHash],
    },
  ];
}

export function getTotalSubscribersEventsCount(
  chainId: ContractsChainId,
  provider: Provider,
  { v1, v2 }: { v1: boolean; v2: boolean }
) {
  const v1Count = v1 ? Object.keys(vaultEvents).length + Object.keys(positionRouterEvents).length : 0;
  const v2Count = v2 ? createV2EventFilters(chainId, ZeroAddress, provider).length : 0;
  return v1Count + v2Count;
}
