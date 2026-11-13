import { getAddressDecoder, getBase58Encoder } from "@solana/kit";

import { GMSOL_STORE_PROGRAM_ID } from "config/gmsol/program";

import layout from "./orderEventLayout.json";

type FieldType = string | { option: FieldType } | { array: [FieldType, number] } | { defined: { name: string } };
type TypeLayout = { kind: string; fields?: { name: string; type: FieldType }[]; variants?: { name: string }[] };
export type OrderEventValue = string | number | bigint | boolean | null | OrderEventValue[] | OrderEventFields;
export type OrderEventFields = { [key: string]: OrderEventValue };
export type OrderEventName = "OrderCreated" | "OrderUpdated" | "OrderRemoved" | "TradeEvent";
export type DecodedOrderEvent = {
  name: OrderEventName;
  outerIndex: number;
  innerIndex: number;
  fields: OrderEventFields;
};
export type OrderEventsResult = {
  network: "solana-mainnet";
  signature: string;
  slot: bigint;
} & (
  | { status: "decoded"; events: DecodedOrderEvent[]; otherEventDiscriminators: string[] }
  | { status: "transaction-failed"; events: [] }
  | { status: "unavailable" | "invalid"; events: []; reason: string }
);

const types = layout.types as Record<string, TypeLayout>;
const base58 = getBase58Encoder();
const publicKey = getAddressDecoder();
// Bounds local decode work; this is not a protocol-level string length limit.
const MAX_BASE58_INSTRUCTION_LENGTH = 90_000;
const hex = (bytes: Uint8Array) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

function requireValue(condition: unknown, reason: string): asserts condition {
  if (!condition) throw new Error(reason);
}
function record(value: unknown): Record<string, unknown> {
  requireValue(value !== null && typeof value === "object" && !Array.isArray(value), "Missing object");
  return value as Record<string, unknown>;
}
function list(value: unknown): unknown[] {
  requireValue(Array.isArray(value), "Missing array");
  return value;
}
function uint(value: unknown): bigint {
  if (typeof value === "number" && Number.isSafeInteger(value)) value = BigInt(value);
  requireValue(typeof value === "bigint" && value >= 0n && value <= (1n << 64n) - 1n, "Invalid unsigned integer");
  return value;
}
function index(value: unknown, length: number): number {
  const parsed = uint(value);
  requireValue(parsed < BigInt(length), "Account or instruction index out of bounds");
  return Number(parsed);
}
function key(value: unknown): string {
  requireValue(typeof value === "string" && value.length >= 32 && value.length <= 44, "Invalid public key");
  requireValue(base58.encode(value).length === 32, "Invalid public key");
  return value;
}

/** Only the pinned event layouts are accepted; no RPC, state mutation or lifecycle inference. */
function decodeFields(name: string, data: Uint8Array): OrderEventFields {
  let offset = 0;
  function take(length: number): Uint8Array {
    requireValue(Number.isSafeInteger(length) && length >= 0 && offset + length <= data.length, "Truncated event");
    const bytes = data.subarray(offset, offset + length);
    offset += length;
    return bytes;
  }
  function decode(type: FieldType): OrderEventValue {
    if (typeof type === "string") {
      if (type === "pubkey") return publicKey.decode(take(32));
      if (type === "bool") {
        const tag = take(1)[0];
        requireValue(tag <= 1, "Invalid boolean tag");
        return tag === 1;
      }
      if (type === "string") {
        const bytes = take(4);
        const length = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0, true);
        return new TextDecoder("utf-8", { fatal: true }).decode(take(length));
      }
      requireValue(["u8", "u64", "i64", "u128", "i128"].includes(type), "Unsupported event primitive");
      const bytes = take(Number(type.slice(1)) / 8);
      if (type === "u8") return bytes[0];
      let value = 0n;
      for (let i = bytes.length - 1; i >= 0; i--) value = (value << 8n) | BigInt(bytes[i]);
      return type[0] === "i" && bytes[bytes.length - 1] >= 128 ? value - (1n << BigInt(bytes.length * 8)) : value;
    }
    if ("option" in type) {
      const tag = take(1)[0];
      requireValue(tag <= 1, "Invalid option tag");
      return tag === 0 ? null : decode(type.option);
    }
    if ("array" in type) return Array.from({ length: type.array[1] }, () => decode(type.array[0]));
    const definition = types[type.defined.name];
    requireValue(definition, "Unknown event type");
    if (definition.kind === "enum") {
      const variant = definition.variants?.[take(1)[0]];
      requireValue(variant, "Unknown event enum");
      return variant.name;
    }
    requireValue(definition.kind === "struct" && definition.fields, "Unsupported event layout");
    return Object.fromEntries(definition.fields.map((field) => [field.name, decode(field.type)]));
  }
  const result = decode({ defined: { name } });
  requireValue(offset === data.length, "Trailing event data");
  return result as OrderEventFields;
}

export function decodeOrderEvents(input: {
  network: "solana-mainnet";
  signature: string;
  slot: bigint;
  receipt: unknown;
}): OrderEventsResult {
  const scope = { network: input.network, signature: input.signature, slot: input.slot };
  try {
    requireValue(input.network === "solana-mainnet", "Unsupported event network");
    requireValue(
      typeof input.signature === "string" &&
        input.signature.length <= 88 &&
        base58.encode(input.signature).length === 64,
      "Invalid signature"
    );
    requireValue(uint(input.slot) > 0n, "Invalid slot");
    const receipt = record(input.receipt);
    requireValue(
      receipt.version === "legacy" || receipt.version === 0 || receipt.version === 0n,
      "Unsupported transaction version"
    );
    requireValue(uint(receipt.slot) === input.slot, "Receipt slot mismatch");
    const transaction = record(receipt.transaction);
    requireValue(list(transaction.signatures)[0] === input.signature, "Receipt signature mismatch");
    if (receipt.meta === null || receipt.meta === undefined)
      return { ...scope, status: "unavailable", events: [], reason: "Missing metadata" };
    const meta = record(receipt.meta);
    if (!("err" in meta)) return { ...scope, status: "unavailable", events: [], reason: "Missing execution result" };
    if (meta.err !== null) {
      requireValue(
        (typeof meta.err === "string" && meta.err.length > 0) ||
          (typeof meta.err === "object" && !Array.isArray(meta.err) && Object.keys(meta.err).length > 0),
        "Invalid execution result"
      );
      return { ...scope, status: "transaction-failed", events: [] };
    }
    if (meta.innerInstructions === null || meta.innerInstructions === undefined)
      return { ...scope, status: "unavailable", events: [], reason: "Missing inner instructions" };
    const message = record(transaction.message);
    const staticKeys = list(message.accountKeys).map(key);
    let loaded: string[] = [];
    if (receipt.version !== "legacy" || (meta.loadedAddresses !== undefined && meta.loadedAddresses !== null)) {
      if (meta.loadedAddresses === null || meta.loadedAddresses === undefined)
        return { ...scope, status: "unavailable", events: [], reason: "Missing loaded addresses" };
      const addresses = record(meta.loadedAddresses);
      loaded = [...list(addresses.writable), ...list(addresses.readonly)].map(key);
    }
    const accounts = [...staticKeys, ...loaded];
    const outerInstructions = list(message.instructions);
    const seen = new Set<number>();
    const events: DecodedOrderEvent[] = [];
    const otherEventDiscriminators: string[] = [];
    for (const rawGroup of list(meta.innerInstructions)) {
      const group = record(rawGroup);
      const outerIndex = index(group.index, outerInstructions.length);
      requireValue(!seen.has(outerIndex), "Duplicate inner instruction group");
      seen.add(outerIndex);
      for (const [innerIndex, rawInstruction] of list(group.instructions).entries()) {
        const instruction = record(rawInstruction);
        const program = accounts[index(instruction.programIdIndex, accounts.length)];
        const ixAccounts = list(instruction.accounts).map((i) => accounts[index(i, accounts.length)]);
        if (program !== GMSOL_STORE_PROGRAM_ID) continue;
        requireValue(
          typeof instruction.data === "string" && instruction.data.length <= MAX_BASE58_INSTRUCTION_LENGTH,
          "Invalid event instruction data"
        );
        const data = base58.encode(instruction.data);
        const isAuthority = ixAccounts.length === 1 && ixAccounts[0] === layout.envelope.eventAuthority;
        const isEvent = hex(data.subarray(0, 8)) === layout.envelope.tagHex;
        if (!isEvent && !isAuthority) continue;
        requireValue(isEvent && isAuthority && data.length >= 16, "Invalid event envelope");
        const discriminator = hex(data.subarray(8, 16));
        const definition = layout.events.find((event) => event.discriminatorHex === discriminator);
        if (!definition) {
          requireValue(layout.otherEventDiscriminators.includes(discriminator), "Unsupported event discriminator");
          otherEventDiscriminators.push(discriminator);
          continue;
        }
        const fields = decodeFields(definition.name, data.subarray(16));
        if ("slot" in fields) requireValue(fields.slot === input.slot, "Event slot mismatch");
        events.push({ name: definition.name as OrderEventName, outerIndex, innerIndex, fields });
      }
    }
    return { ...scope, status: "decoded", events, otherEventDiscriminators };
  } catch (error) {
    return {
      ...scope,
      status: "invalid",
      events: [],
      reason: error instanceof Error ? error.message : "Invalid event receipt",
    };
  }
}
