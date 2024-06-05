import EventEmitter from "abis/EventEmitter.json";
import { getContract } from "config/contracts";
import type { EventLogData, EventTxnParams } from "context/SyntheticsEvents/types";
import { AbiCoder, Contract, Provider, ProviderEvent, ZeroAddress, ethers } from "ethers";
import { MutableRefObject } from "react";

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

const ORDER_CREATED_HASH = ethers.id("OrderCreated");
const ORDER_EXECUTED_HASH = ethers.id("OrderExecuted");
const ORDER_CANCELLED_HASH = ethers.id("OrderCancelled");
const ORDER_UPDATED_HASH = ethers.id("OrderUpdated");

const POSITION_INCREASE_HASH = ethers.id("PositionIncrease");
const POSITION_DECREASE_HASH = ethers.id("PositionDecrease");

export function subscribeToV2Events(
  chainId: number,
  provider: Provider,
  account: string,
  eventLogHandlers: MutableRefObject<
    Record<string, undefined | ((data: EventLogData, txnOpts: EventTxnParams) => void)>
  >
) {
  const eventEmitter = new ethers.Contract(getContract(chainId, "EventEmitter"), EventEmitter.abi, provider);

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

function createV2EventFilters(chainId: number, account: string, wsProvider: Provider): ProviderEvent[] {
  const addressHash = AbiCoder.defaultAbiCoder().encode(["address"], [account]);
  const eventEmitter = new ethers.Contract(getContract(chainId, "EventEmitter"), EventEmitter.abi, wsProvider);
  const EVENT_LOG_TOPIC = eventEmitter.interface.getEvent("EventLog")?.topicHash ?? null;
  const EVENT_LOG1_TOPIC = eventEmitter.interface.getEvent("EventLog1")?.topicHash ?? null;
  const EVENT_LOG2_TOPIC = eventEmitter.interface.getEvent("EventLog2")?.topicHash ?? null;
  return [
    // DEPOSITS AND WITHDRAWALS
    {
      address: getContract(chainId, "EventEmitter"),
      topics: [EVENT_LOG2_TOPIC, [DEPOSIT_CREATED_HASH, WITHDRAWAL_CREATED_HASH], null, addressHash],
    },
    // NEW CONTRACTS
    {
      address: getContract(chainId, "EventEmitter"),
      topics: [EVENT_LOG2_TOPIC, [DEPOSIT_CREATED_HASH, WITHDRAWAL_CREATED_HASH], null, addressHash],
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
        [DEPOSIT_CANCELLED_HASH, DEPOSIT_EXECUTED_HASH, WITHDRAWAL_CANCELLED_HASH, WITHDRAWAL_EXECUTED_HASH],
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
  ];
}

export function getTotalSubscribersEventsCount(
  chainId: number,
  provider: Provider,
  { v1, v2 }: { v1: boolean; v2: boolean }
) {
  const v1Count = v1 ? Object.keys(vaultEvents).length + Object.keys(positionRouterEvents).length : 0;
  const v2Count = v2 ? createV2EventFilters(chainId, ZeroAddress, provider).length : 0;
  return v1Count + v2Count;
}
