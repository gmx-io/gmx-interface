import { getSolanaResponseHandler, SolanaReadOptions } from "utils/http/solana";
import { IHttp } from "utils/http/types";
import { assertApiRecords } from "utils/http/validation";
import { deserializeBigIntsInObject } from "utils/numbers";

import type { ApiOrderInfo, SolanaApiOrderFields, SolanaOrderActionState } from "./types";

const ORDERS_ENDPOINT = "/v1/orders";

function fail(name: string, expected: string): never {
  throw new Error(`${ORDERS_ENDPOINT}: expected ${expected} field "${name}"`);
}

function readString(value: unknown, name: string): string {
  return typeof value === "string" ? value : fail(name, "string");
}

function readNullableString(value: unknown, name: string): string | undefined {
  return value === null ? undefined : readString(value, name);
}

function readUint(value: unknown, name: string): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : fail(name, "number");
}

function readObject(value: unknown, name: string): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : fail(name, "object");
}

function readActionState(value: unknown, name: string): SolanaOrderActionState {
  return value === "pending" || value === "completed" || value === "cancelled" ? value : fail(name, "action state");
}

const SOLANA_FIELD_READERS: {
  [K in keyof SolanaApiOrderFields]: (value: unknown, name: string) => SolanaApiOrderFields[K];
} = {
  orderAccount: readString,
  actionState: readActionState,
  positionAccount: readNullableString,
  rentReceiver: readString,
  referrer: readNullableString,
  callback: (value, name) => {
    if (value === null) {
      return undefined;
    }
    const callback = readObject(value, name);
    return {
      version: readUint(callback.version, `${name}.version`),
      program: readString(callback.program, `${name}.program`),
      sharedData: readString(callback.sharedData, `${name}.sharedData`),
      partitionedData: readString(callback.partitionedData, `${name}.partitionedData`),
    };
  },
  escrowTokens: (value, name) => {
    const tokens = readObject(value, name);
    return {
      initialCollateralToken: readNullableString(tokens.initialCollateralToken, `${name}.initialCollateralToken`),
      finalOutputToken: readNullableString(tokens.finalOutputToken, `${name}.finalOutputToken`),
      longToken: readNullableString(tokens.longToken, `${name}.longToken`),
      shortToken: readNullableString(tokens.shortToken, `${name}.shortToken`),
    };
  },
};

export function parseApiOrder(raw: Record<string, unknown>): ApiOrderInfo {
  const order: Record<string, unknown> = deserializeBigIntsInObject(raw, { handleInts: true });
  // read from the raw record, so base58 keys that are all digits stay strings
  for (const [name, read] of Object.entries(SOLANA_FIELD_READERS)) {
    if (raw[name] !== undefined) {
      order[name] = read(raw[name], name);
    }
  }
  return order as ApiOrderInfo;
}

export async function fetchApiOrders(
  ctx: { api: IHttp },
  params: { address: string } & SolanaReadOptions
): Promise<ApiOrderInfo[]> {
  const orders: unknown = await ctx.api.fetchJson(ORDERS_ENDPOINT, {
    query: {
      address: params.address,
      minContextSlot: params.minContextSlot,
    },
    onResponse: getSolanaResponseHandler(params.onResponse),
  });
  assertApiRecords(orders, ORDERS_ENDPOINT);
  return orders.map((order) => parseApiOrder(order));
}
