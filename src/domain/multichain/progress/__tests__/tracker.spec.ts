import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { ARBITRUM, ARBITRUM_SEPOLIA, SOURCE_BASE_MAINNET, SOURCE_SEPOLIA } from "config/chains";
import { Operation } from "domain/synthetics/markets/types";
import { IS_RECORDING } from "domain/testUtils/rpc/recordedResponder";
import { getGlvToken, getGmToken } from "domain/tokens";
import { expandDecimals, numberToBigint } from "lib/numbers";

import { GlvBuyTask, GmBuyTask } from "../GmOrGlvBuyProgress";
import { GlvSellTask, GmSellTask } from "../GmOrGlvSellProgress";
import { finishRecordedRpc, installRecordedRpc } from "./recordedRpc";

// Recording talks to the real chains and LayerZero scan, so it needs real-network patience.
vi.setConfig({ testTimeout: IS_RECORDING ? 120_000 : 10_000 });

vi.mock("lib/wallets/walletConfig", async (importOriginal) => {
  const original = await importOriginal<typeof import("lib/wallets/walletConfig")>();
  const { createFastPollingPublicClient } = await import("./recordedRpc");

  return {
    ...original,
    getPublicClientWithRpc: createFastPollingPublicClient(original.getRpcTransport),
  };
});

beforeAll(() => {
  installRecordedRpc();
});

afterAll(() => {
  finishRecordedRpc();
});

describe("LongCrossChainTask", () => {
  it("gm sell", async () => {
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

  it("glv buy base -> arb successful", async () => {
    const sourceChainId = SOURCE_BASE_MAINNET;
    const settlementChainId = ARBITRUM;
    const initialTxHash = "0x0f143ac5e6d0759c3d47cd7dfc56208633e8524371f11c37100e8030a1016eca";
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

    await expect(progress.getStepPromise("finished")).resolves.toBeUndefined();
  });

  it("glv sell 1 GLV base -> arb", async () => {
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

    await expect(progress.getStepPromise("finished")).resolves.toBeUndefined();
  });

  it("recovered market token glv buy", async () => {
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

    await expect(progress.getStepPromise("finished")).rejects.toMatchObject({
      name: "ConversionFailed",
      chainId: settlementChainId,
      operation: Operation.Deposit,
      // The deposit is created by the LayerZero compose tx on the settlement chain, not by the source tx.
      creationTx: "0x00186ee1cdb67446c1be3e164850f6bfcd89637d9886bf24e5a5b235ab79b10a",
    });
  });

  it("sepolia reverted glv buy", async () => {
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

    await expect(progress.getStepPromise("finished")).rejects.toMatchObject({
      name: "BridgeInFailed",
      chainId: sourceChainId,
      creationTx: initialTxHash,
      fundsLeftIn: "source",
    });
  });

  it("sepolia glv market buy", async () => {
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

    await expect(progress.getStepPromise("finished")).rejects.toMatchObject({
      name: "ConversionFailed",
      chainId: settlementChainId,
      operation: Operation.Deposit,
      creationTx: "0xaec94ff83efbd046931e980f1d60a1d5e02e7c43c20558f56fb8251d54ea6562",
    });
  });

  it("glv sell 7.45 GLV to ETH base -> arb", async () => {
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

  it("gm buy 0.5 USDC to GM: ETH/USD base -> arb", async () => {
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

    await expect(progress.getStepPromise("finished")).rejects.toMatchObject({
      name: "ConversionFailed",
      chainId: settlementChainId,
      operation: Operation.Deposit,
      creationTx: "0x11b6ff14bb7bfa70335be0adf286c059ae38c56b1d0b53b6afb963984ce4a0c6",
    });
  });

  it("gm buy 0.5 USDC to GM: ETH/USD base -> arb failed lz compose", async () => {
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

    await expect(progress.getStepPromise("finished")).rejects.toMatchObject({
      name: "BridgeInFailed",
      chainId: sourceChainId,
      creationTx: initialTxHash,
      fundsLeftIn: "gmx-lz",
    });
  });

  it("gm sell 0.1000 GM: ETH/USD base -> arb", async () => {
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

    await expect(progress.getStepPromise("finished")).rejects.toMatchObject({
      name: "ConversionFailed",
      chainId: settlementChainId,
      operation: Operation.Withdrawal,
      executionTx: "0x70d981717971ca611b8490abde5ad586e5206d17b6b4c20f7151483b2f382d91",
      operationKey: "0x1977a8eca2e3fe5f31be22e13d0d8ad5d89b3bc52c0e94b9b003aac6164b3e80",
    });
  });

  it("gm buy 0.0305 GM: ETH/USD[WETH-USDC.SG] sepolia -> arb sep canceled deposit", async () => {
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

    await expect(progress.getStepPromise("finished")).rejects.toMatchObject({
      name: "ConversionFailed",
      chainId: settlementChainId,
      operation: Operation.Deposit,
      executionTx: "0x50105483bf336e0ee141057fe8ac7bfeec2edabfeab198a1ad008dba0d3778eb",
      operationKey: "0xd2743599937b3c57ba25e660ebe8de361e4324efab1f1c6694f523b348dabf17",
    });
  });

  it("gm buy 3.0482 GM: ETH/USD[WETH-USDC.SG] sepolia -> arb sep successful", async () => {
    const sourceChainId = SOURCE_SEPOLIA;
    const settlementChainId = ARBITRUM_SEPOLIA;
    const initialTxHash = "0x5e38289a7794007c17ad6c72ecd423303055373c51e2efb3f0dab04e695f96ac";
    const token = getGmToken(ARBITRUM_SEPOLIA, "0xb6fC4C9eB02C35A134044526C62bb15014Ac0Bcc");
    const amount = numberToBigint(3.0482, 18);

    const progress = new GmBuyTask({
      sourceChainId,
      initialTxHash,
      token,
      amount,
      settlementChainId,
      estimatedFeeUsd: 0n,
    });

    await expect(progress.getStepPromise("finished")).resolves.toBeUndefined();
  });

  it("gm sell 0.1000 GM: ETH/USD[WETH-USDC.SG] arb sep -> sepolia successful", async () => {
    const settlementChainId = ARBITRUM_SEPOLIA;
    const sourceChainId = SOURCE_SEPOLIA;
    const initialTxHash = "0x904650289ec101699d63dded838d46f1107b034d51e31a11a659d5c25a56bb5f";
    const token = getGmToken(ARBITRUM_SEPOLIA, "0xb6fC4C9eB02C35A134044526C62bb15014Ac0Bcc");
    const amount = numberToBigint(0.1, 18);

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

  it("gm sell to PAIR 0.1000 GM: ETH/USD[WETH-USDC.SG] arb sep -> sepolia successful", async () => {
    const settlementChainId = ARBITRUM_SEPOLIA;
    const sourceChainId = SOURCE_SEPOLIA;
    const initialTxHash = "0x3f0f5393b51b448deca10cf2515bfbd871612efdd7b574a1b786d8ee784411aa";
    const token = getGmToken(ARBITRUM_SEPOLIA, "0xb6fC4C9eB02C35A134044526C62bb15014Ac0Bcc");
    const amount = numberToBigint(0.1, 18);

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
});
