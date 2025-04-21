import { encodeAbiParameters, keccak256, stringToBytes } from "viem";

import { LRUCache } from "./LruCache";

export const ZERO_DATA = "0x";

const dataCache = new LRUCache<string>(10_000);

export function hashData(dataTypes, dataValues) {
  const key = JSON.stringify({ dataTypes, dataValues }, (_, val) => (typeof val === "bigint" ? String(val) : val));

  if (dataCache.has(key)) {
    return dataCache.get(key)!;
  }

  // Convert dataTypes from array of strings to array of objects with 'type' property
  const abiParameters = dataTypes.map((type) => ({ type }));
  const bytes = encodeAbiParameters(abiParameters, dataValues);
  const hash = keccak256(bytes);

  dataCache.set(key, hash);

  return hash;
}

const stringCache = new LRUCache<string>(10_000);

export function hashString(string: string) {
  if (stringCache.has(string)) {
    return stringCache.get(string)!;
  }

  const hash = hashData(["string"], [string]);
  stringCache.set(string, hash);

  return hash;
}

export function hashDataMap<
  R extends Record<string, [dataTypes: string[], dataValues: (string | number | bigint | boolean)[]] | undefined>,
>(
  map: R
): {
  [K in keyof R]: string;
} {
  const result = {};
  for (const key of Object.keys(map)) {
    if (!map[key]) {
      continue;
    }

    const [dataTypes, dataValues] = map[key]!;

    result[key] = hashData(dataTypes, dataValues);
  }

  return result as {
    [K in keyof R]: string;
  };
}

export function keccakString(string: string) {
  return keccak256(stringToBytes(string));
}
