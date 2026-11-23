import { getSolanaResponseHandler } from "utils/http/solana";
import type { IHttp, SolanaReadOptions } from "utils/http/types";
import { assertApiRecords, readApiString, readApiUnsignedInteger } from "utils/http/validation";
import { deserializeBigIntsInObject } from "utils/numbers";
import { isRecord } from "utils/objects";

import type { ApiOrderInfo, SolanaApiOrderFields } from "./types";

const ORDERS_ENDPOINT = "/v1/orders";

function getSolanaFieldReaders(endpoint: string): {
  [K in keyof SolanaApiOrderFields]: (value: unknown, name: string) => SolanaApiOrderFields[K];
} {
  const readString = (value: unknown, name: string) => readApiString({ record: { [name]: value }, name, endpoint });
  const readNullableString = (value: unknown, name: string) => (value === null ? undefined : readString(value, name));
  const readRecord = (value: unknown, name: string) => {
    if (!isRecord(value)) throw new Error(`${endpoint}: expected object field "${name}"`);
    return value;
  };

  return {
    orderAccount: readString,
    actionState: (value, name) => {
      if (value === "pending" || value === "completed" || value === "cancelled") return value;
      throw new Error(`${endpoint}: expected action state field "${name}"`);
    },
    positionAccount: readNullableString,
    rentReceiver: readString,
    referrer: readNullableString,
    callback: (value, name) => {
      if (value === null) {
        return undefined;
      }
      const callback = readRecord(value, name);
      return {
        version: readApiUnsignedInteger({
          record: { [`${name}.version`]: callback.version },
          name: `${name}.version`,
          endpoint,
        }),
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
