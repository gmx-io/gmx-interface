import * as ethers from "ethers";
import { Abi, Hash, parseEventLogs, ParseEventLogsReturnType, PublicClient } from "viem";

import { abis } from "sdk/abis";
import { expandDecimals } from "lib/numbers";
import { LogEntry } from "./types";

const PANIC_SIGNATURE4 = ethers.id("Panic(uint256)").slice(0, 10);
const PANIC_MAP = {
  0x00: "generic compiler inserted panics",
  0x01: "call assert with an argument that evaluates to false",
  0x11: "arithmetic operation results in underflow or overflow outside of an unchecked { ... } block.",
  0x12: "divide or modulo operation by zero (e.g. 5 / 0 or 23 % 0)",
  0x21: "convert a value that is too big or negative into an enum type",
  0x22: "access a storage byte array that is incorrectly encoded",
  0x31: "call .pop() on an empty array.",
  0x32: "access an array, bytesN or an array slice at an out-of-bounds or negative index",
  0x41: "allocate too much memory or create an array that is too large",
  0x51: "call a zero-initialized variable of internal function type.",
};

const errorsInterface = new ethers.Interface(abis.CustomErrors);
const eventEmitterInterface = new ethers.Interface(abis.EventEmitter);
const defaultAbiCoder = new ethers.AbiCoder();

function getErrorString(error: { name: string; args: any[] }) {
  return JSON.stringify({
    name: error.name,
    args: error.args.map((value) => value.toString()),
  });
}

function parseError(reasonBytes, shouldThrow = true) {
  if (reasonBytes.startsWith(PANIC_SIGNATURE4)) {
    const [panicCode] = defaultAbiCoder.decode(["uint256"], "0x" + reasonBytes.slice(10));
    return {
      name: "Panic",
      args: [panicCode.toString(), PANIC_MAP[panicCode.toString()]],
    } as any;
  }

  try {
    const reason = errorsInterface.parseError(reasonBytes);
    return reason;
  } catch (e) {
    if (!shouldThrow) {
      return {
        name: "Unknown",
        args: [reasonBytes],
      };
    }
    throw new Error(`Could not parse errorBytes ${reasonBytes}`);
  }
}

export function convertToContractPrice(price: bigint, tokenDecimals: number) {
  return price / expandDecimals(1, tokenDecimals);
}

export function convertFromContractPrice(price: bigint, tokenDecimals: number) {
  return price * expandDecimals(1, tokenDecimals);
}

function parseEvent(event: ParseEventLogsReturnType<Abi, undefined, true, undefined>[number]) {
  const values: LogEntry[] = [];
  const parsedLog = eventEmitterInterface.parseLog(event);

  if (!parsedLog) {
    return {
      key: `${event.logIndex}${event.transactionHash}`,
      topics: event.topics,
      name: event.eventName,
      values: [],
    };
  }

  const eventName = parsedLog.args[1];
  const eventData = parsedLog.args[parsedLog.args.length - 1];

  for (const type of ["address", "uint", "int", "bool", "bytes32", "bytes", "string"]) {
    const key = `${type}Items`;
    for (const item of eventData[key].items) {
      const value: LogEntry = {
        item: item.key,
        value: type === "bytes32" ? item.value.toString() : item.value,
        type,
      };

      if (item.key === "reasonBytes") {
        const error = parseError(item.value, false);
        const parsedReason = error ? getErrorString(error) : undefined;
        value.error = parsedReason;
      }

      values.push(value);
    }

    for (const [item, vals] of eventData[key].arrayItems) {
      const value = {
        item: item,
        value: vals,
        type,
      };

      values.push(value);
    }
  }

  return {
    key: `${event.logIndex}${event.transactionHash}`,
    log: event.eventName,
    topics: event.topics,
    name: eventName,
    values,
  };
}

export async function parseTxEvents(client: PublicClient, txHash: Hash) {
  const receipt = await client.getTransactionReceipt({ hash: txHash });
  if (!receipt) throw new Error("Transaction not found");

  const parsed = parseEventLogs({
    abi: abis.EventEmitter as Abi,
    logs: receipt.logs,
  });

  return parsed.map(parseEvent);
}
