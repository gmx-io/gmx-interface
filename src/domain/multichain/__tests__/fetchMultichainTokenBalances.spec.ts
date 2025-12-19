import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ARBITRUM, SOURCE_BASE_MAINNET } from "config/chains";
import { getMulticallBatchingLoggingEnabledKey } from "config/localStorage";
import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";

import { fetchMultichainTokenBalances } from "../fetchMultichainTokenBalances";

const DEBUG = false;

describe("fetchMultichainTokenBalances", () => {
  if (DEBUG) {
    beforeAll(() => {
      localStorage.setItem(JSON.stringify(getMulticallBatchingLoggingEnabledKey()), "1");
    });

    afterAll(() => {
      localStorage.removeItem(JSON.stringify(getMulticallBatchingLoggingEnabledKey()));
    });
  }

  it("should fetch real token balances", async () => {
    const account = "0x0000000000000000000000000000000000000000";
    const result = await fetchMultichainTokenBalances({
      settlementChainId: ARBITRUM,
      account,
    });
    expect(result[SOURCE_BASE_MAINNET][NATIVE_TOKEN_ADDRESS]).toBeGreaterThan(0n);
  }, 10_000);
});
