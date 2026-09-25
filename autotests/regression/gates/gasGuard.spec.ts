import { expect, test } from "@playwright/test";

import { checkGasPrice } from "../funded/gasGuard";

const options = {
  chainId: 42161,
  rpcUrl: "https://rpc.invalid",
  maxGasGwei: "0.1",
};

function reader(overrides = {}) {
  return {
    getChainId: async () => 42161,
    getGasPrice: async () => 100_000_000n,
    getBlock: async () => ({ timestamp: BigInt(Math.floor(Date.now() / 1000)) }),
    ...overrides,
  };
}

test("funded gas gate permits the ceiling, then blocks a later increase", async () => {
  const rpc = reader();
  expect((await checkGasPrice({ ...options, reader: rpc })).allowed).toBe(true);
  rpc.getGasPrice = async () => 100_000_001n;
  expect(await checkGasPrice({ ...options, reader: rpc })).toMatchObject({ allowed: false, reason: /High gas/ });
});

test("funded gas gate rejects missing or invalid limits before contacting RPC", async () => {
  const rpc = reader({
    getGasPrice: async () => {
      throw new Error("Must not contact RPC");
    },
  });
  for (const maxGasGwei of [undefined, "", "0", "-1", "NaN", "1e3", "0.0000000001"]) {
    expect(await checkGasPrice({ ...options, maxGasGwei, reader: rpc })).toMatchObject({
      allowed: false,
      reason: /gas limit/,
    });
  }
});

test("funded gas gate blocks missing, failing, stale and wrong-chain RPCs", async () => {
  expect((await checkGasPrice({ ...options, rpcUrl: undefined })).allowed).toBe(false);
  const cases = [
    { getChainId: async () => 43114 },
    {
      getGasPrice: async () => {
        throw new Error("secret RPC endpoint");
      },
    },
    { getGasPrice: async () => 0n },
    { getBlock: async () => ({ timestamp: 0n }) },
    { getBlock: async () => ({ timestamp: BigInt(Math.floor(Date.now() / 1000) + 600) }) },
  ];
  for (const overrides of cases) {
    const result = await checkGasPrice({ ...options, reader: reader(overrides) });
    expect(result.allowed).toBe(false);
    expect(JSON.stringify(result)).not.toContain("secret RPC endpoint");
  }
});
