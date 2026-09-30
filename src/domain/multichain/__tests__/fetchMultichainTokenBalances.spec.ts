import path from "path";
import { fileURLToPath } from "url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ARBITRUM, SOURCE_BASE_MAINNET } from "config/chains";
import { IS_RECORDING } from "domain/testUtils/rpc/recordedResponder";
import { createRecordedRpcSuite } from "domain/testUtils/rpc/recordedSuite";
import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";

import { fetchMultichainTokenBalances } from "../fetchMultichainTokenBalances";

const rpc = createRecordedRpcSuite({
  fixturesDir: path.join(path.dirname(fileURLToPath(import.meta.url)), "__fixtures__"),
});

beforeAll(() => {
  rpc.install();
});

afterAll(() => {
  rpc.finish();
});

describe("fetchMultichainTokenBalances", () => {
  it("should fetch real token balances", { timeout: IS_RECORDING ? 60_000 : 10_000 }, async () => {
    const account = "0x0000000000000000000000000000000000000000";
    const result = await fetchMultichainTokenBalances({
      settlementChainId: ARBITRUM,
      account,
    });
    expect(result[SOURCE_BASE_MAINNET][NATIVE_TOKEN_ADDRESS]).toBeGreaterThan(0n);
  });
});
