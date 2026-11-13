import { getSolanaResponseHandler, SolanaReadOptions } from "utils/http/solana";
import { IHttp } from "utils/http/types";
import { assertApiRecords, getApiFieldReaders } from "utils/http/validation";
import { deserializeBigIntsInObject } from "utils/numbers";

import type { ApiOrderInfo, SolanaApiOrderFields } from "./types";

const ORDERS_ENDPOINT = "/v1/orders";

function getSolanaFieldReaders(endpoint: string): {
  [K in keyof SolanaApiOrderFields]: (value: unknown, name: string) => SolanaApiOrderFields[K];
} {
  const { fail, readNullableString, readRecord, readString, readUint } = getApiFieldReaders(endpoint);

  return {
    orderAccount: readString,
    actionState: (value, name) =>
      value === "pending" || value === "completed" || value === "cancelled" ? value : fail(name, "action state"),
    positionAccount: readNullableString,
    rentReceiver: readString,
    referrer: readNullableString,
    callback: (value, name) => {
      if (value === null) {
        return undefined;
      }
      const callback = readRecord(value, name);
      return {
        version: readUint(callback.version, `${name}.version`),
        program: readString(callback.program, `${name}.program`),
        sharedData: readString(callback.sharedData, `${name}.sharedData`),
        partitionedData: readString(callback.partitionedData, `${name}.partitionedData`),
      };
    },
    escrowTokens: (value, name) => {
      const tokens = readRecord(value, name);
      return {
        initialCollateralToken: readNullableString(tokens.initialCollateralToken, `${name}.initialCollateralToken`),
        finalOutputToken: readNullableString(tokens.finalOutputToken, `${name}.finalOutputToken`),
        longToken: readNullableString(tokens.longToken, `${name}.longToken`),
        shortToken: readNullableString(tokens.shortToken, `${name}.shortToken`),
      };
    },
  };
}

export function parseApiOrders(orders: unknown, endpoint: string): ApiOrderInfo[] {
  assertApiRecords(orders, endpoint);
  const solanaFields = Object.entries(getSolanaFieldReaders(endpoint));

  return orders.map((raw) => {
    const order: Record<string, unknown> = deserializeBigIntsInObject(raw, { handleInts: true });
    // Solana records carry all of these and EVM records none; read raw, so all-digit base58 keys stay strings
    if (solanaFields.some(([name]) => raw[name] !== undefined)) {
      for (const [name, read] of solanaFields) {
        order[name] = read(raw[name], name);
      }
    }
    return order as ApiOrderInfo;
  });
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
  return parseApiOrders(orders, ORDERS_ENDPOINT);
}
