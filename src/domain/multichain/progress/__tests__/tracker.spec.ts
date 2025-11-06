import { describe, it } from "vitest";

import { ARBITRUM_SEPOLIA, SOURCE_SEPOLIA } from "config/chains";
import { getGmToken } from "domain/tokens";
import { expandDecimals } from "lib/numbers";

import { GmSellTask } from "../GmOrGlvSellProgress";

// TODO add test for each progress task
describe("GmSellTask", () => {
  it("should work", { timeout: 30_000 }, async () => {
    const sourceChainId = SOURCE_SEPOLIA;
    const initialTxHash = "0xea5bd0e941b9d1834712cc5dbbdd7880ddd714eeddce9ffe062b4c99e30c6078";
    const token = getGmToken(ARBITRUM_SEPOLIA, "0xb6fC4C9eB02C35A134044526C62bb15014Ac0Bcc");
    const amount = expandDecimals(1, 18);

    const progress = new GmSellTask(sourceChainId, initialTxHash, token, amount);

    await progress.getStepPromise("finished");
  });
});
