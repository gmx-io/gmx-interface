import { describe, it } from "vitest";

import { ARBITRUM, ARBITRUM_SEPOLIA, SOURCE_BASE_MAINNET, SOURCE_SEPOLIA } from "config/chains";
import { getGlvToken, getGmToken } from "domain/tokens";
import { expandDecimals } from "lib/numbers";

import { GlvBuyTask } from "../GmOrGlvBuyProgress";
import { GmSellTask } from "../GmOrGlvSellProgress";

// TODO add test for each progress task
describe.concurrent("GmSellTask", () => {
  it("gm sell", { timeout: 30_000 }, async () => {
    const sourceChainId = SOURCE_SEPOLIA;
    const initialTxHash = "0xea5bd0e941b9d1834712cc5dbbdd7880ddd714eeddce9ffe062b4c99e30c6078";
    const token = getGmToken(ARBITRUM_SEPOLIA, "0xb6fC4C9eB02C35A134044526C62bb15014Ac0Bcc");
    const amount = expandDecimals(1, 18);

    const progress = new GmSellTask(sourceChainId, initialTxHash, token, amount);

    await progress.getStepPromise("finished");
  });

  it("glv buy", { timeout: 30_000 }, async () => {
    const sourceChainId = SOURCE_BASE_MAINNET;
    const initialTxHash = "0xb383801e8c4a94ba6b66a6f308ac1fd1b0de154c5e6df61713abbddd1d8487ec";
    const token = getGlvToken(ARBITRUM, "0x528A5bac7E746C9A509A1f4F6dF58A03d44279F9");
    const amount = expandDecimals(1, 18);

    const progress = new GlvBuyTask(sourceChainId, initialTxHash, token, amount);

    await progress.getStepPromise("finished");
  });
});
