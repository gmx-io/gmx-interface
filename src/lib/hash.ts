import { AbiCoder, ethers } from "ethers";

import { LRUCache } from "lib/LruCache";

const dataCache = new LRUCache<string>(10_000);

let totalHashTime = 0;

export function hashData(dataTypes, dataValues) {
  const key = JSON.stringify({ dataTypes, dataValues }, (_, val) => {
    return typeof val === "bigint" ? String(val) : val;
  });

  if (dataCache.has(key)) {
    return dataCache.get(key)!;
  }

  let start = Date.now();
  const bytes = AbiCoder.defaultAbiCoder().encode(dataTypes, dataValues);
  const hash = ethers.keccak256(ethers.getBytes(bytes));
  totalHashTime += Date.now() - start;
  console.log("total hash time", totalHashTime);

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
