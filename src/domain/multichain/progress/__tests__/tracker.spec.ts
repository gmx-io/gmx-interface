import { describe, expect, it } from "vitest";

import { ARBITRUM, ARBITRUM_SEPOLIA, SOURCE_BASE_MAINNET, SOURCE_SEPOLIA } from "config/chains";
import { getGlvToken, getGmToken } from "domain/tokens";
import { expandDecimals } from "lib/numbers";

import { Operation } from "components/GmSwap/GmSwapBox/types";

import { GlvBuyTask } from "../GmOrGlvBuyProgress";
import { GlvSellTask, GmSellTask } from "../GmOrGlvSellProgress";
import { BridgeInFailed, ConversionFailed } from "../MultichainTransferProgress";

describe.concurrent("LongCrossChainTask", () => {
  it("gm sell", { timeout: 30_000 }, async () => {
    const sourceChainId = SOURCE_SEPOLIA;
    const settlementChainId = ARBITRUM_SEPOLIA;
    const initialTxHash = "0xea5bd0e941b9d1834712cc5dbbdd7880ddd714eeddce9ffe062b4c99e30c6078";
    const token = getGmToken(ARBITRUM_SEPOLIA, "0xb6fC4C9eB02C35A134044526C62bb15014Ac0Bcc");
    const amount = expandDecimals(1, 18);

    const progress = new GmSellTask({
      settlementChainId,
      sourceChainId,
      initialTxHash,
      token,
      amount,
    });

    await expect(progress.getStepPromise("finished")).resolves.toBeUndefined();
  });

  it("glv buy", { timeout: 30_000 }, async () => {
    const sourceChainId = SOURCE_BASE_MAINNET;
    const settlementChainId = ARBITRUM;
    const initialTxHash = "0xb383801e8c4a94ba6b66a6f308ac1fd1b0de154c5e6df61713abbddd1d8487ec";
    const token = getGlvToken(ARBITRUM, "0x528A5bac7E746C9A509A1f4F6dF58A03d44279F9");
    const amount = expandDecimals(1, 18);

    const progress = new GlvSellTask({
      sourceChainId,
      initialTxHash,
      token,
      amount,
      settlementChainId,
    });

    await progress.getStepPromise("finished");
  });

  it("recovered market token glv buy", { timeout: 30_000 }, async () => {
    const sourceChainId = SOURCE_BASE_MAINNET;
    const settlementChainId = ARBITRUM;
    const initialTxHash = "0xebbb4240344068f4f3260bfbefea4b83732d935e8357ab24582ea59c03fd4d50";
    const token = getGlvToken(ARBITRUM, "0x528A5bac7E746C9A509A1f4F6dF58A03d44279F9");
    const amount = expandDecimals(1, 18);

    const progress = new GlvBuyTask({
      sourceChainId,
      initialTxHash,
      token,
      amount,
      settlementChainId,
    });

    await expect(progress.getStepPromise("finished")).rejects.toThrowError(
      new ConversionFailed({
        chainId: settlementChainId,
        operation: Operation.Deposit,
        creationTx: initialTxHash,
      })
    );
  });

  it.only("sepolia reverted glv buy", { timeout: 30_000 }, async () => {
    const sourceChainId = SOURCE_SEPOLIA;
    const settlementChainId = ARBITRUM_SEPOLIA;
    const initialTxHash = "0xb065aa691f70edf8e47317cd7748abe85358a1807445679b981b049a1259bcf9";
    const token = getGlvToken(ARBITRUM_SEPOLIA, "0x528A5bac7E746C9A509A1f4F6dF58A03d44279F9");
    const amount = expandDecimals(1, 18);

    const progress = new GlvBuyTask({
      sourceChainId,
      initialTxHash,
      token,
      amount,
      settlementChainId,
    });

    await expect(progress.getStepPromise("finished")).rejects.toThrowError(
      new BridgeInFailed({
        chainId: sourceChainId,
        creationTx: initialTxHash,
        fundsLeftIn: "source",
      })
    );
  });

  it("sepolia glv market buy", { timeout: 30_000 }, async () => {
    const sourceChainId = SOURCE_SEPOLIA;
    const settlementChainId = ARBITRUM_SEPOLIA;
    const initialTxHash = "0x29576bb08a500f07795d0281d5aec08f0df641d2976e3accf0436d2b3126c2aa";
    const token = getGlvToken(ARBITRUM_SEPOLIA, "0xAb3567e55c205c62B141967145F37b7695a9F854");
    const amount = expandDecimals(1, 18);

    const progress = new GlvBuyTask({
      sourceChainId,
      initialTxHash,
      token,
      amount,
      settlementChainId,
    });

    await expect(progress.getStepPromise("finished")).rejects.toThrowError(
      new ConversionFailed({
        chainId: settlementChainId,
        operation: Operation.Deposit,
        creationTx: initialTxHash,
      })
    );
  });
});
