import "lib/monkeyPatching";
import "lib/polyfills";

import { afterAll, beforeAll, describe } from "vitest";

// import { ARBITRUM } from "config/chains";
import { getMulticallBatchingLoggingEnabledKey } from "config/localStorage";

// import { fetchMultichainTokenBalances } from "./fetchMultichainTokenBalances";

describe.skip("fetchMultichainTokenBalances", () => {
  beforeAll(() => {
    localStorage.setItem(JSON.stringify(getMulticallBatchingLoggingEnabledKey()), "1");
  });

  afterAll(() => {
    localStorage.removeItem(JSON.stringify(getMulticallBatchingLoggingEnabledKey()));
  });

  // it("should fetch real token balances", { timeout: 30_000 }, async () => {
  //   const account = "0x8F091A33f310EFd8Ca31f7aE4362d6306cA6Ec8d";
  //   const result = await fetchMultichainTokenBalances(ARBITRUM, account);
  // });
});
