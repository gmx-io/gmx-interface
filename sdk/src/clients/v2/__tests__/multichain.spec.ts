import { isAddress } from "viem";
import { beforeAll, describe, expect, it } from "vitest";

import {
  ensureSourceErc20Allowance,
  expectArbitrumSettlement,
  getSourceSigner,
  shouldSendOnChain,
  STARGATE_USDC_ARBITRUM,
  STARGATE_USDC_BASE,
  TEST_SOURCE_CHAIN_ID,
  USDC_ARBITRUM,
  USDC_BASE,
  waitForWithdrawStatus,
} from "./multichainTestUtil";
import { getTestSdk, getTestSigner } from "./testUtil";

beforeAll(() => {
  expectArbitrumSettlement();
});

const sdk = getTestSdk();
const signer = getTestSigner();
const account = signer?.address ?? "";
const hasSigner = signer !== undefined;

const DEPOSIT_AMOUNT = 1_000_000n; // 1 USDC
const WITHDRAW_AMOUNT = 500_000n; // 0.5 USDC

describe.skipIf(!hasSigner)("multichain same-chain (build only)", () => {
  it("deposit: multicall(sendTokens + bridgeIn)", () => {
    const built = sdk.buildSameChainDepositTxn({
      tokenAddress: USDC_ARBITRUM,
      amount: DEPOSIT_AMOUNT,
      account,
    });
    expect(isAddress(built.to)).toBe(true);
    expect(built.data.startsWith("0x")).toBe(true);
    expect(built.value).toBe(0n);
  });

  it("withdraw: transferOut(BridgeOutParams)", () => {
    const params = sdk.buildSameChainWithdrawBridgeOutParams({
      tokenAddress: USDC_ARBITRUM,
      amount: WITHDRAW_AMOUNT,
    });
    expect(params.amount).toBe(WITHDRAW_AMOUNT);

    const built = sdk.buildSameChainWithdrawTxn({ bridgeOutParams: params });
    expect(isAddress(built.to)).toBe(true);
    expect(built.value).toBe(0n);
  });
});

describe.skipIf(!hasSigner)("multichain cross-chain deposit (Base → Arbitrum, API-driven)", () => {
  it("prepare: server resolves pools + quotes nativeFee + composeGas (tokenSymbol)", async () => {
    const prepared = await sdk.prepareCrossChainDeposit({
      srcChainId: TEST_SOURCE_CHAIN_ID,
      account,
      tokenSymbol: "USDC",
      amount: DEPOSIT_AMOUNT,
    });

    expect(prepared.payloadType).toBe("transaction");
    expect(isAddress(prepared.payload.to)).toBe(true);
    expect(prepared.payload.data.startsWith("0x")).toBe(true);
    expect(prepared.composeGas).toBeGreaterThan(0n);
    expect(prepared.nativeFee).toBeGreaterThan(0n);
    expect(prepared.payload.value).toBeGreaterThanOrEqual(prepared.nativeFee);
  });

  it("prepare: server resolves pools when tokenAddress is provided", async () => {
    const prepared = await sdk.prepareCrossChainDeposit({
      srcChainId: TEST_SOURCE_CHAIN_ID,
      account,
      tokenAddress: USDC_ARBITRUM,
      amount: DEPOSIT_AMOUNT,
    });

    expect(prepared.nativeFee).toBeGreaterThan(0n);
    expect(prepared.composeGas).toBeGreaterThan(0n);
  });

  it.skipIf(!shouldSendOnChain())("execute: submits bridge tx on Base", async () => {
    const sourceSigner = getSourceSigner()!;

    await ensureSourceErc20Allowance({
      sdk,
      signer: sourceSigner,
      tokenAddress: USDC_BASE,
      spender: STARGATE_USDC_BASE,
      minAmount: DEPOSIT_AMOUNT,
    });

    const result = await sdk.executeCrossChainDeposit(sourceSigner, {
      srcChainId: TEST_SOURCE_CHAIN_ID,
      account,
      tokenSymbol: "USDC",
      amount: DEPOSIT_AMOUNT,
    });

    expect(result.txnHash.startsWith("0x")).toBe(true);
    expect(result.nativeFee).toBeGreaterThan(0n);
  });
});

describe.skipIf(!hasSigner)("multichain cross-chain withdraw (Arbitrum → Base, via Gelato)", () => {
  it("prepare: returns typed-data + gasPaymentParams", async () => {
    const bridgeOutParams = sdk.buildCrossChainWithdrawBridgeOutParams({
      tokenAddress: USDC_ARBITRUM,
      amount: WITHDRAW_AMOUNT,
      dstChainId: TEST_SOURCE_CHAIN_ID,
      stargateAddress: STARGATE_USDC_ARBITRUM,
    });

    const prepared = await sdk.prepareCrossChainWithdraw({
      srcChainId: TEST_SOURCE_CHAIN_ID,
      account,
      bridgeOutParams,
    });

    expect(prepared.payloadType).toBe("typed-data");
    expect(prepared.payload.typedData.primaryType).toBe("BridgeOut");
    expect(prepared.payload.gasPaymentParams.relayerFeeAmount).toBeGreaterThan(0n);
  });

  it.skipIf(!shouldSendOnChain())("execute: resolves to terminal Gelato status", async () => {
    const bridgeOutParams = sdk.buildCrossChainWithdrawBridgeOutParams({
      tokenAddress: USDC_ARBITRUM,
      amount: WITHDRAW_AMOUNT,
      dstChainId: TEST_SOURCE_CHAIN_ID,
      stargateAddress: STARGATE_USDC_ARBITRUM,
    });

    const submitted = await sdk.executeCrossChainWithdraw(signer!, {
      srcChainId: TEST_SOURCE_CHAIN_ID,
      account,
      bridgeOutParams,
    });
    expect(submitted.requestId).toBeDefined();

    const final = await waitForWithdrawStatus(sdk, submitted.requestId, 120_000);
    expect(["executed", "cancelled", "relay_failed", "relay_reverted"]).toContain(final.status);
  });
});
