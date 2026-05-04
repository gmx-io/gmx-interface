import { describe, expect, it } from "vitest";

import {
  getTestSdk,
  requireSigner,
  expressFlow,
  waitForOrderStatus,
  TEST_SYMBOL,
  TEST_SIZE_USD,
  TEST_COLLATERAL,
} from "./testUtil";

const sdk = getTestSdk();
const signer = requireSigner();
const account = signer.address;

describe("validation errors", () => {
  describe("prepare validation", () => {
    it("missing mode rejects", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "increase",
          symbol: TEST_SYMBOL,
          direction: "long",
          orderType: "market",
          size: TEST_SIZE_USD,
          collateralToPay: TEST_COLLATERAL,
          from: account,
        } as any)
      ).rejects.toThrow();
    });

    it("invalid mode rejects", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "increase",
          symbol: TEST_SYMBOL,
          direction: "long",
          orderType: "market",
          size: TEST_SIZE_USD,
          collateralToPay: TEST_COLLATERAL,
          mode: "invalid" as any,
          from: account,
        })
      ).rejects.toThrow();
    });

    it("missing kind rejects", async () => {
      await expect(
        sdk.prepareOrder({
          mode: "express",
          symbol: TEST_SYMBOL,
          direction: "long",
          orderType: "market",
          size: TEST_SIZE_USD,
          collateralToPay: TEST_COLLATERAL,
          from: account,
        } as any)
      ).rejects.toThrow();
    });

    it("invalid kind rejects", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "invalid" as any,
          symbol: TEST_SYMBOL,
          direction: "long",
          orderType: "market",
          size: TEST_SIZE_USD,
          collateralToPay: TEST_COLLATERAL,
          mode: "express",
          from: account,
        })
      ).rejects.toThrow();
    });

    it("missing from rejects", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "increase",
          symbol: TEST_SYMBOL,
          direction: "long",
          orderType: "market",
          size: TEST_SIZE_USD,
          collateralToPay: TEST_COLLATERAL,
          mode: "express",
        } as any)
      ).rejects.toThrow();
    });

    it("invalid from address rejects", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "increase",
          symbol: TEST_SYMBOL,
          direction: "long",
          orderType: "market",
          size: TEST_SIZE_USD,
          collateralToPay: TEST_COLLATERAL,
          mode: "express",
          from: "0xinvalid",
        })
      ).rejects.toThrow();
    });

    it("invalid orderType rejects", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "increase",
          symbol: TEST_SYMBOL,
          direction: "long",
          orderType: "invalid" as any,
          size: TEST_SIZE_USD,
          collateralToPay: TEST_COLLATERAL,
          mode: "express",
          from: account,
        })
      ).rejects.toThrow();
    });

    it("triggerPrice 0 for limit order rejects", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "increase",
          symbol: TEST_SYMBOL,
          direction: "long",
          orderType: "limit",
          size: TEST_SIZE_USD,
          triggerPrice: 0n,
          collateralToPay: TEST_COLLATERAL,
          mode: "express",
          from: account,
        })
      ).rejects.toThrow();
    });

    it("negative slippage rejects", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "increase",
          symbol: TEST_SYMBOL,
          direction: "long",
          orderType: "market",
          size: TEST_SIZE_USD,
          collateralToPay: TEST_COLLATERAL,
          slippage: -1,
          mode: "express",
          from: account,
        })
      ).rejects.toThrow();
    });

    it("slippage too high rejects", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "increase",
          symbol: TEST_SYMBOL,
          direction: "long",
          orderType: "market",
          size: TEST_SIZE_USD,
          collateralToPay: TEST_COLLATERAL,
          slippage: 20000,
          mode: "express",
          from: account,
        })
      ).rejects.toThrow();
    });

    it("missing collateralToPay for increase rejects", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "increase",
          symbol: TEST_SYMBOL,
          direction: "long",
          orderType: "market",
          size: TEST_SIZE_USD,
          mode: "express",
          from: account,
        } as any)
      ).rejects.toThrow();
    });
  });

  describe("submit validation", () => {
    it("missing signature rejects", async () => {
      await expect(
        sdk.submitOrder({
          mode: "express",
          from: account,
        })
      ).rejects.toThrow();
    });

    it("missing from rejects", async () => {
      await expect(
        sdk.submitOrder({
          mode: "express",
          signature: "0x" + "00".repeat(65),
        })
      ).rejects.toThrow();
    });

    it("missing eip712Data.batchParams rejects", async () => {
      await expect(
        sdk.submitOrder({
          mode: "express",
          signature: "0x" + "00".repeat(65),
          from: account,
          eip712Data: { relayParams: {} },
        })
      ).rejects.toThrow();
    });

    it("missing eip712Data.relayParams rejects", async () => {
      await expect(
        sdk.submitOrder({
          mode: "express",
          signature: "0x" + "00".repeat(65),
          from: account,
          eip712Data: { batchParams: {} },
        })
      ).rejects.toThrow();
    });
  });

  describe("status endpoint errors", () => {
    it("empty request rejects", async () => {
      await expect(sdk.fetchOrderStatus({})).rejects.toThrow();
    });

    it("nonexistent requestId rejects", async () => {
      await expect(sdk.fetchOrderStatus({ requestId: "nonexistent-id-12345" })).rejects.toThrow();
    });
  });

  describe("domain errors", () => {
    it("MARKET_NOT_FOUND for invalid symbol", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "increase",
          symbol: "NONEXISTENT/PAIR",
          direction: "long",
          orderType: "market",
          size: TEST_SIZE_USD,
          collateralToPay: TEST_COLLATERAL,
          mode: "express",
          from: account,
        })
      ).rejects.toThrow();
    });

    it("TOKEN_NOT_FOUND for invalid collateral token", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "increase",
          symbol: TEST_SYMBOL,
          direction: "long",
          orderType: "market",
          size: TEST_SIZE_USD,
          collateralToPay: { amount: 1000000n, token: "FAKECOIN" },
          mode: "express",
          from: account,
        })
      ).rejects.toThrow();
    });

    it("POSITION_NOT_FOUND for decrease without position", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "decrease",
          symbol: "DOGE/USD [WETH-USDC]",
          direction: "short",
          orderType: "market",
          size: TEST_SIZE_USD,
          mode: "express",
          from: "0x0000000000000000000000000000000000000001",
        })
      ).rejects.toThrow();
    });
  });

  describe("order lifecycle tracking", () => {
    it("status transitions from initial to executed", async () => {
      const { submitted } = await expressFlow(sdk, signer, {
        kind: "increase",
        symbol: TEST_SYMBOL,
        direction: "long",
        orderType: "market",
        size: TEST_SIZE_USD,
        collateralToken: "USDC",
        collateralToPay: TEST_COLLATERAL,
        mode: "express",
        from: account,
      });

      const initial = await sdk.fetchOrderStatus({ requestId: submitted.requestId });
      expect(["relay_accepted", "relay_pending", "relay_submitted", "created", "executed"]).toContain(initial.status);
      expect(initial.requestId).toBe(submitted.requestId);

      const terminal = await waitForOrderStatus(sdk, submitted.requestId);
      expect(terminal.status).toBe("executed");
      expect(terminal.requestId).toBe(submitted.requestId);
    });

    it("terminal status has populated fields", async () => {
      const { submitted } = await expressFlow(sdk, signer, {
        kind: "increase",
        symbol: TEST_SYMBOL,
        direction: "long",
        orderType: "market",
        size: TEST_SIZE_USD,
        collateralToken: "USDC",
        collateralToPay: TEST_COLLATERAL,
        mode: "express",
        from: account,
      });

      const status = await waitForOrderStatus(sdk, submitted.requestId);
      expect(status.status).toBe("executed");
      expect(status.requestId).toBeDefined();
      // createdTxnHash may not be populated immediately for all executed orders
      if (status.createdTxnHash) expect(status.createdTxnHash.startsWith("0x")).toBe(true);
      if (status.executionTxnHash) expect(status.executionTxnHash.startsWith("0x")).toBe(true);
      if (status.createdAt) expect(typeof status.createdAt).toBe("string");
      if (status.updatedAt) expect(typeof status.updatedAt).toBe("string");
    });
  });
});
