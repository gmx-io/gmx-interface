import { AbiCoder, ethers } from "ethers";

import { LRUCache } from "lib/LruCache";

const dataCache = new LRUCache<string>(10_000);

export function hashData(dataTypes, dataValues) {
  const key = JSON.stringify({ dataTypes, dataValues });
  if (dataCache.has(key)) {
    return dataCache.get(key)!;
  }

  const bytes = AbiCoder.defaultAbiCoder().encode(dataTypes, dataValues);
  const hash = ethers.keccak256(ethers.getBytes(bytes));

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
