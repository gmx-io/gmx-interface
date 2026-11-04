import {
  encodeAbiParameters,
  encodeEventTopics,
  pad,
  type Abi,
  type AbiEvent,
  type Hex,
  type TransactionReceipt,
} from "viem";

import EventEmitter from "../../../sdk/src/abis/EventEmitter";
import { getContract } from "../../../sdk/src/configs/contracts";

export function fundedOrderReceipt({
  account,
  market,
  keys,
  eventName = "OrderCreated",
}: {
  account: Hex;
  market: string;
  keys: Hex[];
  eventName?:
    | "OrderCreated"
    | "OrderCancelled"
    | "OrderExecuted"
    | "OrderFrozen"
    | "DepositCreated"
    | "WithdrawalCreated"
    | "GlvDepositCreated"
    | "GlvWithdrawalCreated";
}) {
  const event = (EventEmitter as Abi).find((e) => e.type === "event" && e.name === "EventLog2") as AbiEvent;
  return {
    status: "success",
    logs: keys.map((key) => {
      const data = Object.fromEntries(
        ["addressItems", "uintItems", "intItems", "boolItems", "bytes32Items", "bytesItems", "stringItems"].map(
          (name) => [name, { items: [] as { key: string; value: string }[], arrayItems: [] }]
        )
      );
      data.addressItems.items = [
        { key: "account", value: account },
        { key: "market", value: market },
      ];
      data.bytes32Items.items = [{ key: "key", value: key }];
      return {
        address: getContract(42161, "EventEmitter"),
        topics: encodeEventTopics({
          abi: [event],
          eventName: "EventLog2",
          args: { eventNameHash: eventName, topic1: key, topic2: pad(account) },
        }),
        data: encodeAbiParameters(
          event.inputs.filter((i) => !i.indexed),
          [account, eventName, data]
        ),
      };
    }),
  } as unknown as TransactionReceipt;
}
