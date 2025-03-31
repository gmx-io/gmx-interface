import { describe, it, beforeAll, afterAll } from "vitest";

import { ARBITRUM } from "config/chains";
import { getMulticallBatchingLoggingEnabledKey } from "config/localStorage";

import { fetchMultichainTokenBalances } from "./fetchMultichainTokenBalances";

describe("fetchMultichainTokenBalances", () => {
  beforeAll(() => {
    localStorage.setItem(JSON.stringify(getMulticallBatchingLoggingEnabledKey()), "1");
  });

  afterAll(() => {
    localStorage.removeItem(JSON.stringify(getMulticallBatchingLoggingEnabledKey()));
  });

  it("should fetch real token balances", { timeout: 30_000 }, async () => {
    const account = "0x8F091A33f310EFd8Ca31f7aE4362d6306cA6Ec8d";
    const result = await fetchMultichainTokenBalances(ARBITRUM, account);
    console.log("Token balances:", JSON.stringify(result, null, 2));
  });
});
