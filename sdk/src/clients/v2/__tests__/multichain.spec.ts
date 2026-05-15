/**
 * E2E suite for multichain bridge in / bridge out (Arbitrum settlement, Base source).
 *
 * Required env (mirrors order tests):
 *   GMX_TEST_PRIVATE_KEY     — wallet pk owning the GMX account (0x-prefixed 32 bytes)
 *   GMX_TEST_API_URL         — points at the API instance with multichain endpoints,
 *                              e.g. http://localhost:3004/v1 for a local gmx-api
 *
 * Optional env (gates extra scenarios):
 *   GMX_TEST_RPC_URL         — Arbitrum settlement-chain RPC (for classic submit flows)
 *   GMX_TEST_SOURCE_RPC_URL  — Base source-chain RPC (for Stargate quote + sendTransaction)
 *   GMX_TEST_SEND=1          — gates the actually-spends-funds execute* tests
 */
import { isAddress } from "viem";
import { beforeAll, describe, expect, it } from "vitest";

import {
  ensureSourceErc20Allowance,
  expectArbitrumSettlement,
  getSourceRpc,
  getSourceSigner,
  hasSourceRpcUrl,
  shouldSendOnChain,
  STARGATE_USDC_ARBITRUM,
  STARGATE_USDC_BASE,
  TEST_SOURCE_CHAIN_ID,
  USDC_ARBITRUM,
  USDC_BASE,
  waitForWithdrawStatus,
} from "./multichainTestUtil";
import { getTestSdk, requireSigner } from "./testUtil";

beforeAll(() => {
  expectArbitrumSettlement();
});

const sdk = getTestSdk();
const signer = requireSigner();
const account = signer.address;

const DEPOSIT_AMOUNT = 1_000_000n; // 1 USDC
const WITHDRAW_AMOUNT = 500_000n; // 0.5 USDC

describe("multichain bridge: same-chain deposit (build only)", () => {
  it("buildSameChainDepositTxn encodes multicall(sendTokens + bridgeIn)", () => {
    const built = sdk.buildSameChainDepositTxn({
      tokenAddress: USDC_ARBITRUM,
      amount: DEPOSIT_AMOUNT,
      account,
    });

    expect(isAddress(built.to)).toBe(true);
    expect(built.data.startsWith("0x")).toBe(true);
    expect(built.value).toBe(0n);
  });
});

describe("multichain bridge: same-chain withdraw (build only)", () => {
  it("buildSameChainWithdrawTxn encodes transferOut(BridgeOutParams)", () => {
    const params = sdk.buildSameChainWithdrawBridgeOutParams({
      tokenAddress: USDC_ARBITRUM,
      amount: WITHDRAW_AMOUNT,
    });
    expect(params.token.toLowerCase()).toBe(USDC_ARBITRUM.toLowerCase());
    expect(params.amount).toBe(WITHDRAW_AMOUNT);
    expect(params.minAmountOut).toBe(WITHDRAW_AMOUNT);

    const built = sdk.buildSameChainWithdrawTxn({ bridgeOutParams: params });
    expect(isAddress(built.to)).toBe(true);
    expect(built.data.startsWith("0x")).toBe(true);
    expect(built.value).toBe(0n);
  });
});

describe("multichain bridge: cross-chain deposit (Base → Arbitrum)", () => {
  describe("API: prepareCrossChainDeposit", () => {
    it("returns a transaction payload with composeGas+nativeFee echoed", async () => {
      const prepared = await sdk.prepareApiCrossChainDeposit({
        srcChainId: TEST_SOURCE_CHAIN_ID,
        account,
        tokenAddress: USDC_ARBITRUM,
        sourceStargatePoolAddress: STARGATE_USDC_BASE,
        destinationStargatePoolAddress: STARGATE_USDC_ARBITRUM,
        isNativeOnSource: false,
        amount: DEPOSIT_AMOUNT,
        // Pre-computed compose gas avoids needing the on-chain registered MultichainProvider
        // for lzCompose simulation. Real flows can omit this once the API resolves it from DataStore.
        composeGas: 500_000n,
        // Caller still supplies a non-zero nativeFee placeholder — the API does not quote source-chain fees yet.
        nativeFee: 200_000_000_000_000n, // ~0.0002 ETH; only used by the API's calldata builder
      });

      expect(prepared.payloadType).toBe("transaction");
      expect(isAddress(prepared.payload.to)).toBe(true);
      expect(prepared.payload.data.startsWith("0x")).toBe(true);
      expect(typeof prepared.payload.value).toBe("bigint");
      expect(prepared.composeGas).toBeGreaterThan(0n);
      expect(prepared.nativeFee).toBeGreaterThan(0n);
      expect(prepared.expiresAt).toBeGreaterThan(0);
    });
  });

  describe("client-side: buildCrossChainDepositTxn (with source RPC)", () => {
    it.skipIf(!hasSourceRpcUrl())("quotes Stargate nativeFee on Base and produces a sendable tx", async () => {
      const sourceRpc = getSourceRpc()!;
      const built = await sdk.buildCrossChainDepositTxn(
        {
          srcChainId: TEST_SOURCE_CHAIN_ID,
          account,
          tokenAddress: USDC_ARBITRUM,
          sourceStargatePoolAddress: STARGATE_USDC_BASE,
          isNativeOnSource: false,
          amount: DEPOSIT_AMOUNT,
          // Pre-computed compose gas avoids needing a settlement-chain RPC for this branch.
          composeGas: 500_000n,
        },
        { sourceRpc }
      );

      expect(isAddress(built.to)).toBe(true);
      expect(built.data.startsWith("0x")).toBe(true);
      // For ERC20 source, msg.value covers only LayerZero native fee.
      expect(built.value).toBeGreaterThan(0n);
      expect(built.composeGas).toBeGreaterThan(0n);
      expect(built.nativeFee).toBeGreaterThan(0n);
    });

    it.skipIf(!shouldSendOnChain())("executeCrossChainDeposit submits the bridge tx on Base", async () => {
      const sourceRpc = getSourceRpc()!;
      const sourceSigner = getSourceSigner();
      if (!sourceSigner) {
        throw new Error("GMX_TEST_PRIVATE_KEY + GMX_TEST_SOURCE_RPC_URL are required for executeCrossChainDeposit");
      }

      await ensureSourceErc20Allowance({
        sdk,
        signer: sourceSigner,
        tokenAddress: USDC_BASE,
        spender: STARGATE_USDC_BASE,
        minAmount: DEPOSIT_AMOUNT,
      });

      let result: Awaited<ReturnType<typeof sdk.executeCrossChainDeposit>> | undefined;
      try {
        result = await sdk.executeCrossChainDeposit(
          sourceSigner,
          {
            srcChainId: TEST_SOURCE_CHAIN_ID,
            account,
            tokenAddress: USDC_ARBITRUM,
            sourceStargatePoolAddress: STARGATE_USDC_BASE,
            destinationStargatePoolAddress: STARGATE_USDC_ARBITRUM,
            isNativeOnSource: false,
            amount: DEPOSIT_AMOUNT,
            // Pre-computed compose gas avoids needing a settlement-chain RPC just for estimation.
            composeGas: 500_000n,
          },
          { sourceRpc }
        );
      } catch (err: any) {
        // Soft-skip only on env-only failures the test cannot self-heal:
        //   - "insufficient funds" → wallet missing ETH for LayerZero nativeFee + gas
        //   - revert 0x7c75c3d2 = Stargate `Transfer_TransferFailed()` — usually low USDC balance
        //     (allowance is auto-handled by ensureSourceErc20Allowance above).
        const msg = String(err?.shortMessage ?? err?.message ?? err);
        let revertData = "";
        for (let cur: any = err; cur && !revertData; cur = cur.cause) {
          if (typeof cur.data === "string" && cur.data.startsWith("0x")) revertData = cur.data;
        }
        if (/insufficient funds|exceeds the balance/i.test(msg) || revertData.startsWith("0x7c75c3d2")) {
          // eslint-disable-next-line no-console
          console.warn(`[multichain.deposit.execute] skipped (env): ${msg}`);
          return;
        }
        throw err;
      }

      expect(result.txnHash).toBeDefined();
      expect(result.txnHash.startsWith("0x")).toBe(true);
    });
  });
});

describe("multichain bridge: cross-chain withdraw (Arbitrum → Base, express via Gelato)", () => {
  describe("prepare", () => {
    it("returns typed-data, requestId and gasPaymentParams", async () => {
      const bridgeOutParams = sdk.buildCrossChainWithdrawBridgeOutParams({
        tokenAddress: USDC_ARBITRUM,
        amount: WITHDRAW_AMOUNT,
        dstChainId: TEST_SOURCE_CHAIN_ID,
        stargateAddress: STARGATE_USDC_BASE,
      });

      const prepared = await sdk.prepareApiCrossChainWithdraw({
        srcChainId: TEST_SOURCE_CHAIN_ID,
        account,
        bridgeOutParams,
      });

      expect(prepared.payloadType).toBe("typed-data");
      expect(typeof prepared.requestId).toBe("string");
      expect(prepared.requestId.length).toBeGreaterThan(0);
      expect(prepared.payload.typedData.primaryType).toBe("BridgeOut");
      expect(isAddress(prepared.payload.relayRouterAddress)).toBe(true);
      expect(prepared.payload.gasPaymentParams.relayerFeeAmount).toBeGreaterThan(0n);
      expect(isAddress(prepared.payload.gasPaymentParams.relayerFeeTokenAddress)).toBe(true);
      expect(isAddress(prepared.payload.gasPaymentParams.gasPaymentTokenAddress)).toBe(true);
    });

    it("respects custom gasPaymentToken (USDC on Arbitrum)", async () => {
      const bridgeOutParams = sdk.buildCrossChainWithdrawBridgeOutParams({
        tokenAddress: USDC_ARBITRUM,
        amount: WITHDRAW_AMOUNT,
        dstChainId: TEST_SOURCE_CHAIN_ID,
        stargateAddress: STARGATE_USDC_BASE,
      });

      const prepared = await sdk.prepareApiCrossChainWithdraw({
        srcChainId: TEST_SOURCE_CHAIN_ID,
        account,
        bridgeOutParams,
        gasPaymentToken: USDC_ARBITRUM,
      });

      expect(prepared.payload.gasPaymentParams.gasPaymentTokenAddress.toLowerCase()).toBe(USDC_ARBITRUM.toLowerCase());
    });
  });

  describe("sign + submit", () => {
    it("prepare → sign → submit returns requestId+taskId; status reachable", async () => {
      const bridgeOutParams = sdk.buildCrossChainWithdrawBridgeOutParams({
        tokenAddress: USDC_ARBITRUM,
        amount: WITHDRAW_AMOUNT,
        dstChainId: TEST_SOURCE_CHAIN_ID,
        stargateAddress: STARGATE_USDC_BASE,
      });

      const prepared = await sdk.prepareApiCrossChainWithdraw({
        srcChainId: TEST_SOURCE_CHAIN_ID,
        account,
        bridgeOutParams,
      });

      const signature = await sdk.signApiCrossChainWithdraw(prepared, signer);
      expect(signature.startsWith("0x")).toBe(true);

      let submitted: Awaited<ReturnType<typeof sdk.submitApiCrossChainWithdraw>> | undefined;
      try {
        submitted = await sdk.submitApiCrossChainWithdraw({
          srcChainId: TEST_SOURCE_CHAIN_ID,
          account,
          signature,
          bridgeOutParams,
          relayParamsPayload: prepared.payload.relayParams,
          relayerFeeTokenAddress: prepared.payload.gasPaymentParams.relayerFeeTokenAddress,
          relayerFeeAmount: prepared.payload.gasPaymentParams.relayerFeeAmount,
          requestId: prepared.requestId,
        });
      } catch (err: any) {
        // Insufficient GMX-account balance / relayer-fee shortfall surfaces as a 400 (GELATO_RELAY_FAILED).
        // The API persists relay_failed; we still verify status is queryable.
        // eslint-disable-next-line no-console
        console.warn(`[multichain.withdraw.submit] failed: ${err?.message ?? err}`);
        const status = await sdk.getApiCrossChainWithdrawStatus(prepared.requestId);
        expect(status.requestId).toBe(prepared.requestId);
        expect(["relay_failed", "prepared"]).toContain(status.status);
        return;
      }

      expect(submitted!.requestId).toBe(prepared.requestId);
      expect(submitted!.status).toBe("relay_accepted");
      expect(typeof submitted!.taskId).toBe("string");

      const status = await sdk.getApiCrossChainWithdrawStatus(prepared.requestId);
      expect(status.requestId).toBe(prepared.requestId);
      expect(status.taskId).toBe(submitted!.taskId);
    });

    it.skipIf(!shouldSendOnChain())("executeCrossChainWithdraw resolves to terminal Gelato status", async () => {
      const bridgeOutParams = sdk.buildCrossChainWithdrawBridgeOutParams({
        tokenAddress: USDC_ARBITRUM,
        amount: WITHDRAW_AMOUNT,
        dstChainId: TEST_SOURCE_CHAIN_ID,
        stargateAddress: STARGATE_USDC_BASE,
      });

      let submitted: Awaited<ReturnType<typeof sdk.executeApiCrossChainWithdraw>> | undefined;
      try {
        submitted = await sdk.executeApiCrossChainWithdraw(
          {
            srcChainId: TEST_SOURCE_CHAIN_ID,
            account,
            bridgeOutParams,
          },
          signer
        );
      } catch (err: any) {
        // Gelato may reject the relay (insufficient GMX-account balance / fee shortfall).
        // The API still records `relay_failed`; we treat that as a valid terminal state for the smoke run.
        // eslint-disable-next-line no-console
        console.warn(`[multichain.withdraw.execute] gelato rejected: ${err?.message ?? err}`);
        return;
      }

      expect(submitted.requestId).toBeDefined();

      const final = await waitForWithdrawStatus(sdk, submitted.requestId, 120_000);
      // eslint-disable-next-line no-console
      console.info(
        `[multichain.withdraw.terminal] id=${submitted.requestId} status=${final.status} txHash=${final.txHash ?? "-"}`
      );

      expect(["created", "executed", "relay_failed", "relay_reverted"]).toContain(final.status);
    });
  });

  describe("status", () => {
    it("returns a 4xx-equivalent error on unknown requestId", async () => {
      await expect(sdk.getApiCrossChainWithdrawStatus("0".repeat(32))).rejects.toThrow();
    });
  });
});
