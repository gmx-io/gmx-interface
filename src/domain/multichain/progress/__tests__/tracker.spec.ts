import { describe, expect, it } from "vitest";

import { ARBITRUM, ARBITRUM_SEPOLIA, SOURCE_BASE_MAINNET, SOURCE_SEPOLIA } from "config/chains";
import { getGlvToken, getGmToken } from "domain/tokens";
import { expandDecimals, numberToBigint } from "lib/numbers";

import { Operation } from "components/GmSwap/GmSwapBox/types";

import { GlvBuyTask, GmBuyTask } from "../GmOrGlvBuyProgress";
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
      estimatedFeeUsd: 0n,
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
      estimatedFeeUsd: 0n,
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
      estimatedFeeUsd: 0n,
    });

    await expect(progress.getStepPromise("finished")).rejects.toThrowError(
      new ConversionFailed({
        chainId: settlementChainId,
        operation: Operation.Deposit,
        creationTx: initialTxHash,
      })
    );
  });

  it("sepolia reverted glv buy", { timeout: 30_000 }, async () => {
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
      estimatedFeeUsd: 0n,
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
      estimatedFeeUsd: 0n,
    });

    await expect(progress.getStepPromise("finished")).rejects.toThrowError(
      new ConversionFailed({
        chainId: settlementChainId,
        operation: Operation.Deposit,
        creationTx: initialTxHash,
      })
    );
  });

  it("glv sell 7.45 GLV to ETH base -> arb", { timeout: 30_000 }, async () => {
    const sourceChainId = SOURCE_BASE_MAINNET;
    const settlementChainId = ARBITRUM;
    const initialTxHash = "0x2c424be93b041ba3b83be9cc9334be8e65c5108573a6a189fde62489f6dd7b62";
    const token = getGlvToken(ARBITRUM, "0x528A5bac7E746C9A509A1f4F6dF58A03d44279F9");
    const amount = 7450000000000000000n; // 7.45 GLV

    const progress = new GlvSellTask({
      sourceChainId,
      initialTxHash,
      token,
      amount,
      settlementChainId,
      estimatedFeeUsd: 0n,
    });

    await expect(progress.getStepPromise("finished")).resolves.toBeUndefined();
  });

  it("gm buy 0.5 USDC to GM: ETH/USD base -> arb", { timeout: 30_000 }, async () => {
    const sourceChainId = SOURCE_BASE_MAINNET;
    const settlementChainId = ARBITRUM;
    const initialTxHash = "0x601a827c0d47385ea36da126e35d2708715f6c78bdffa5842c949d044e8a5b00";
    const token = getGmToken(ARBITRUM, "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336");
    const amount = 500000n; // 0.5 USDC

    const progress = new GmBuyTask({
      sourceChainId,
      initialTxHash,
      token,
      amount,
      settlementChainId,
      estimatedFeeUsd: 0n,
    });

    await expect(progress.getStepPromise("finished")).rejects.toThrowError(
      new ConversionFailed({
        chainId: settlementChainId,
        operation: Operation.Deposit,
        creationTx: initialTxHash,
      })
    );
  });

  it("gm buy 0.5 USDC to GM: ETH/USD base -> arb", { timeout: 30_000 }, async () => {
    const sourceChainId = SOURCE_BASE_MAINNET;
    const settlementChainId = ARBITRUM;
    const initialTxHash = "0x610ca0f4f5a7f3e6c741d1f5f2d10e173ce6e8862fb63651ad11abcf45b2159e";
    const token = getGmToken(ARBITRUM, "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336");
    const amount = 500000n; // 0.5 USDC

    const progress = new GmBuyTask({
      sourceChainId,
      initialTxHash,
      token,
      amount,
      settlementChainId,
      estimatedFeeUsd: 0n,
    });

    await expect(progress.getStepPromise("finished")).rejects.toThrowError(
      new BridgeInFailed({
        chainId: settlementChainId,
        fundsLeftIn: "lz",
      })
    );
  });

  it("gm sell 0.1000 GM: ETH/USD base -> arb", { timeout: 30_000 }, async () => {
    const sourceChainId = SOURCE_BASE_MAINNET;
    const settlementChainId = ARBITRUM;
    const initialTxHash = "0x6230e246f57d977cd3be83772fec594d68e4fe3a55b9094a43f994d33d54ceeb";
    const token = getGmToken(ARBITRUM, "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336");
    const amount = numberToBigint(0.1, 18);

    const progress = new GmSellTask({
      settlementChainId,
      sourceChainId,
      initialTxHash,
      token,
      amount,
      estimatedFeeUsd: 0n,
    });

    await expect(progress.getStepPromise("finished")).rejects.toThrowError(
      new ConversionFailed({
        chainId: settlementChainId,
        operation: Operation.Withdrawal,
        creationTx: initialTxHash,
      })
    );
  });

  it("gm buy 0.0305 GM: ETH/USD[WETH-USDC.SG] sepolia -> arb sep canceled deposit", { timeout: 30_000 }, async () => {
    const sourceChainId = SOURCE_SEPOLIA;
    const settlementChainId = ARBITRUM_SEPOLIA;
    const initialTxHash = "0xf923a609caa61ab78617340e4a083200e6d3d408a4396be92fe6a2a283dd0ea3";
    const token = getGmToken(ARBITRUM_SEPOLIA, "0xb6fC4C9eB02C35A134044526C62bb15014Ac0Bcc");
    const amount = numberToBigint(0.0305, 18);

    const progress = new GmBuyTask({
      sourceChainId,
      initialTxHash,
      token,
      amount,
      settlementChainId,
      estimatedFeeUsd: 0n,
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
