import { describe, expect, it, afterAll, beforeAll } from "vitest";

import { getTestSdk, requireSigner, expressFlow, waitForOrderStatus, activateTestSubaccount, hasRpcUrl, TEST_SYMBOL } from "./testUtil";

const sdk = getTestSdk();
const signer = requireSigner();
const account = signer.address;

describe("swap orders", () => {
  describe("express market swap", () => {
    it("USDC → ETH: estimates → submit → track", async () => {
      const { prepared, submitted } = await expressFlow(sdk, signer, {
        kind: "swap",
        symbol: TEST_SYMBOL,
        orderType: "market",
        size: 1000000n,
        collateralToPay: { amount: 1000000n, token: "USDC" },
        receiveToken: "ETH",
        mode: "express",
        from: account,
      });

      expect(prepared.requestId).toBeDefined();
      expect(prepared.payloadType).toBe("typed-data");

      expect(prepared.estimates).toBeDefined();
      const est = prepared.estimates!;
      expect(est.executionFeeAmount).toBeGreaterThan(0n);
      expect(est.swapPriceImpactDeltaUsd).toBeDefined();

      expect(submitted).toBeDefined();
      expect(submitted.status).toBeDefined();
      expect(submitted.requestId).toBeDefined();

      const status = await sdk.fetchOrderStatus({ requestId: submitted.requestId });
      expect(status.requestId).toBe(submitted.requestId);
    });
  });

  describe("express prepare swap", () => {
    it("prepare returns typed-data with estimates", async () => {
      const prepared = await sdk.prepareOrder({
        kind: "swap",
        symbol: TEST_SYMBOL,
        orderType: "market",
        size: 1000000n,
        collateralToPay: { amount: 1000000n, token: "USDC" },
        receiveToken: "ETH",
        mode: "express",
        from: account,
      });

      expect(prepared.requestId).toBeDefined();
      expect(prepared.payloadType).toBe("typed-data");
      expect(prepared.payload.typedData).toBeDefined();

      expect(prepared.estimates).toBeDefined();
      expect(prepared.estimates!.executionFeeAmount).toBeGreaterThan(0n);
    });
  });

  describe("TWAP swap", () => {
    it("TWAP swap rejects — no swap path for this pair", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "swap",
          symbol: TEST_SYMBOL,
          orderType: "twap",
          size: 1_000_000n,
          collateralToPay: { amount: 1_000_000n, token: "USDC" },
          receiveToken: "ETH",
          twapConfig: { duration: 600, parts: 2 },
          mode: "express",
          from: account,
        })
      ).rejects.toThrow(/swap path/i);
    });
  });

  describe("classic market swap", () => {
    it("prepare returns transaction payload", async () => {
      const prepared = await sdk.prepareOrder({
        kind: "swap",
        symbol: TEST_SYMBOL,
        orderType: "market",
        size: 1000000n,
        collateralToPay: { amount: 1000000n, token: "USDC" },
        receiveToken: "ETH",
        mode: "classic",
        from: account,
      });

      expect(prepared.payloadType).toBe("transaction");
      expect(prepared.payload.to).toBeDefined();
      expect(prepared.payload.data).toBeDefined();
    });
  });

  describe("classic market swap — submit", () => {
    it.skipIf(!hasRpcUrl())("submit classic swap on-chain", async () => {
      const prepared = await sdk.prepareOrder({
        kind: "swap",
        symbol: TEST_SYMBOL,
        orderType: "market",
        size: 1000000n,
        collateralToPay: { amount: 1000000n, token: "USDC" },
        receiveToken: "ETH",
        mode: "classic",
        from: account,
      });

      expect(prepared.payloadType).toBe("transaction");

      const txHash = await signer.sendTransaction({
        to: prepared.payload.to,
        data: prepared.payload.data,
        value: BigInt(prepared.payload.value ?? 0),
      });

      expect(txHash).toBeDefined();
      expect(txHash.startsWith("0x")).toBe(true);
    });
  });

  describe("with subaccount (1CT)", () => {
    const sdkSub = getTestSdk();

    beforeAll(async () => {
      await activateTestSubaccount(sdkSub, signer, account);
    });

    afterAll(() => {
      sdkSub.clearSubaccount();
    });

    it("express swap with subaccount — full submit", async () => {
      const result = await sdkSub.executeExpressOrder(
        {
          kind: "swap",
          symbol: TEST_SYMBOL,
          orderType: "market",
          size: 1000000n,
          collateralToPay: { amount: 1000000n, token: "USDC" },
          receiveToken: "ETH",
          mode: "express",
          from: account,
        },
        signer
      );

      expect(result.requestId).toBeDefined();
      expect(result.status).toBeDefined();

      const status = await waitForOrderStatus(sdk, result.requestId);
      expect(status.status).toBe("executed");
    });
  });

  describe("error cases", () => {
    it("missing receiveToken rejects", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "swap",
          symbol: TEST_SYMBOL,
          orderType: "market",
          size: 1000000n,
          collateralToPay: { amount: 1000000n, token: "USDC" },
          mode: "express",
          from: account,
        } as any)
      ).rejects.toThrow();
    });

    it("missing collateralToPay rejects", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "swap",
          symbol: TEST_SYMBOL,
          orderType: "market",
          size: 1000000n,
          receiveToken: "ETH",
          mode: "express",
          from: account,
        } as any)
      ).rejects.toThrow();
    });

    it("same token swap rejects", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "swap",
          symbol: TEST_SYMBOL,
          orderType: "market",
          size: 1000000n,
          collateralToPay: { amount: 1000000n, token: "USDC" },
          receiveToken: "USDC",
          mode: "express",
          from: account,
        })
      ).rejects.toThrow();
    });

    it("invalid collateral token rejects", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "swap",
          symbol: TEST_SYMBOL,
          orderType: "market",
          size: 1000000n,
          collateralToPay: { amount: 1000000n, token: "FAKECOIN" },
          receiveToken: "ETH",
          mode: "express",
          from: account,
        })
      ).rejects.toThrow();
    });

    it("invalid receiveToken rejects", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "swap",
          symbol: TEST_SYMBOL,
          orderType: "market",
          size: 1000000n,
          collateralToPay: { amount: 1000000n, token: "USDC" },
          receiveToken: "FAKECOIN",
          mode: "express",
          from: account,
        })
      ).rejects.toThrow();
    });
  });
});
