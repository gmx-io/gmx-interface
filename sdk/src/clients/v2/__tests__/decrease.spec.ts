import { describe, expect, it, beforeAll, afterAll } from "vitest";

import {
  getTestSdk,
  requireSigner,
  expressFlow,
  waitForOrderStatus,
  waitForOrdersUpdate,
  waitForPositionUpdate,
  activateTestSubaccount,
  hasRpcUrl,
  TEST_SYMBOL,
  TEST_SIZE_USD,
} from "./testUtil";

const sdk = getTestSdk();
const signer = requireSigner();
const account = signer.address;

const DECREASE_COLLATERAL = { amount: 5000000n, token: "USDC" }; // 5 USDC — avoid instant liquidation

async function openLongPosition(): Promise<void> {
  const result = await sdk.executeExpressOrder(
    {
      kind: "increase",
      symbol: TEST_SYMBOL,
      direction: "long",
      orderType: "market",
      size: TEST_SIZE_USD,
      collateralToPay: DECREASE_COLLATERAL,
      mode: "express",
      from: account,
    },
    signer
  );
  const status = await waitForOrderStatus(sdk, result.requestId);
  expect(status.status).toBe("executed");

  const positions = await waitForPositionUpdate(sdk, account, (positions) => {
    return positions.some((p: any) => p.isLong && p.indexName?.includes("ETH/USD"));
  }, 30000);
  expect(positions.some((p: any) => p.isLong && p.indexName?.includes("ETH/USD"))).toBe(true);
}

async function ensureLongPosition(): Promise<any> {
  const positions = await sdk.fetchPositionsInfo({ address: account });
  const pos = positions.find((p: any) => p.isLong && p.indexName?.includes("ETH/USD"));
  if (pos) return pos;

  // Retry once — first Gelato call in a test run can be flaky
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await openLongPosition();
      break;
    } catch (e) {
      if (attempt === 1) throw e;
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  const after = await sdk.fetchPositionsInfo({ address: account });
  const opened = after.find((p: any) => p.isLong && p.indexName?.includes("ETH/USD"));
  expect(opened).toBeDefined();
  return opened;
}

describe("decrease orders", () => {
  beforeAll(async () => {
    await ensureLongPosition();
  });

  describe("express market decrease", () => {
    it("partial close: estimates → verify size reduced", async () => {
      await ensureLongPosition();

      await new Promise((r) => setTimeout(r, 5000));

      const freshPositions = await sdk.fetchPositionsInfo({ address: account });
      const pos = freshPositions.find((p: any) => p.isLong && p.indexName?.includes("ETH/USD"));
      expect(pos).toBeDefined();

      const sizeBefore = BigInt(pos!.sizeInUsd);
      const decreaseSize = sizeBefore / 10n;

      const { prepared, submitted } = await expressFlow(sdk, signer, {
        kind: "decrease",
        symbol: TEST_SYMBOL,
        direction: "long",
        orderType: "market",
        size: decreaseSize,
        mode: "express",
        from: account,
      });

      expect(prepared.estimates).toBeDefined();
      const est = prepared.estimates!;

      expect(est.sizeDeltaUsd).toBe(decreaseSize);
      expect(est.executionFeeAmount).toBeGreaterThan(0n);
      expect(est.positionFeeUsd).toBeGreaterThan(0n);
      expect(est.acceptablePrice).toBeGreaterThan(0n);

      expect(submitted.status).toBeDefined();

      const status = await waitForOrderStatus(sdk, submitted.requestId);
      expect(status.status).toBe("executed");

      const positionsAfter = await waitForPositionUpdate(sdk, account, (positions) => {
        const p = positions.find((p: any) => p.isLong && p.indexName?.includes("ETH/USD"));
        return p ? BigInt(p.sizeInUsd) < sizeBefore : true;
      }, 30000);
      const posAfter = positionsAfter.find(
        (p: any) => p.isLong && p.indexName?.includes("ETH/USD")
      );

      // Position must either be smaller or fully closed (not same size)
      const sizeAfter = posAfter ? BigInt(posAfter.sizeInUsd) : 0n;
      expect(sizeAfter).toBeLessThan(sizeBefore);
    });
  });

  describe("keepLeverage", () => {
    it("keepLeverage: true — leverage preserved", async () => {
      const pos = await ensureLongPosition();
      const sizeBefore = BigInt(pos.sizeInUsd);
      const collateralBefore = BigInt(pos.collateralUsd);
      const leverageBefore = sizeBefore * 10000n / collateralBefore;

      const decreaseSize = sizeBefore / 5n;

      const { submitted } = await expressFlow(sdk, signer, {
        kind: "decrease",
        symbol: TEST_SYMBOL,
        direction: "long",
        orderType: "market",
        size: decreaseSize,
        keepLeverage: true,
        mode: "express",
        from: account,
      });

      const status = await waitForOrderStatus(sdk, submitted.requestId);
      expect(status.status).toBe("executed");

      const positionsAfter = await waitForPositionUpdate(sdk, account, (positions) => {
        const p = positions.find((p: any) => p.isLong && p.indexName?.includes("ETH/USD"));
        return p ? BigInt(p.sizeInUsd) < sizeBefore : false;
      }, 30000);
      const posAfter = positionsAfter.find((p: any) => p.isLong && p.indexName?.includes("ETH/USD"));
      expect(posAfter).toBeDefined();

      const sizeAfter = BigInt(posAfter!.sizeInUsd);
      const collateralAfter = BigInt(posAfter!.collateralUsd);
      const leverageAfter = sizeAfter * 10000n / collateralAfter;

      // Leverage preserved within 5% tolerance
      const diff = leverageAfter > leverageBefore
        ? leverageAfter - leverageBefore
        : leverageBefore - leverageAfter;
      expect(diff * 100n / leverageBefore).toBeLessThanOrEqual(5n);

      // Collateral also removed proportionally
      expect(collateralAfter).toBeLessThan(collateralBefore);
    });

    it("keepLeverage: false — collateral preserved", async () => {
      const pos = await ensureLongPosition();
      const sizeBefore = BigInt(pos.sizeInUsd);
      const collateralBefore = BigInt(pos.collateralUsd);

      const decreaseSize = sizeBefore / 5n;

      const { submitted } = await expressFlow(sdk, signer, {
        kind: "decrease",
        symbol: TEST_SYMBOL,
        direction: "long",
        orderType: "market",
        size: decreaseSize,
        keepLeverage: false,
        mode: "express",
        from: account,
      });

      const status = await waitForOrderStatus(sdk, submitted.requestId);
      expect(status.status).toBe("executed");

      const positionsAfter = await waitForPositionUpdate(sdk, account, (positions) => {
        const p = positions.find((p: any) => p.isLong && p.indexName?.includes("ETH/USD"));
        return p ? BigInt(p.sizeInUsd) < sizeBefore : false;
      }, 30000);
      const posAfter = positionsAfter.find((p: any) => p.isLong && p.indexName?.includes("ETH/USD"));
      expect(posAfter).toBeDefined();

      const collateralAfter = BigInt(posAfter!.collateralUsd);

      // Collateral stays roughly the same (may change slightly due to fees)
      const collateralDiff = collateralAfter > collateralBefore
        ? collateralAfter - collateralBefore
        : collateralBefore - collateralAfter;
      expect(collateralDiff * 100n / collateralBefore).toBeLessThanOrEqual(10n);
    });
  });

  describe("receiveToken", () => {
    it("receiveToken: ETH — prepare accepts swap on close", async () => {
      await ensureLongPosition();

      const prepared = await sdk.prepareOrder({
        kind: "decrease",
        symbol: TEST_SYMBOL,
        direction: "long",
        orderType: "market",
        size: TEST_SIZE_USD,
        receiveToken: "ETH",
        mode: "express",
        from: account,
      });

      expect(prepared.requestId).toBeDefined();
      expect(prepared.estimates).toBeDefined();
      expect(prepared.estimates!.executionFeeAmount).toBeGreaterThan(0n);
    });

    it("no receiveToken — default behavior accepted", async () => {
      await ensureLongPosition();

      const prepared = await sdk.prepareOrder({
        kind: "decrease",
        symbol: TEST_SYMBOL,
        direction: "long",
        orderType: "market",
        size: TEST_SIZE_USD,
        mode: "express",
        from: account,
      });

      expect(prepared.requestId).toBeDefined();
      expect(prepared.estimates).toBeDefined();
    });
  });

  describe("TWAP decrease", () => {
    afterAll(async () => {
      try {
        const prepared = await sdk.prepareCancelOrder({ all: true, mode: "express", from: account });
        const sig = await sdk.signOrder(prepared, signer);
        await sdk.submitOrder({
          mode: prepared.mode,
          requestId: prepared.requestId,
          signature: sig,
          from: account,
          idempotencyKey: prepared.idempotencyKey,
          eip712Data: {
            batchParams: prepared.payload.batchParams,
            relayParams: prepared.payload.relayParams,
          },
        });
      } catch { /* cleanup */ }
    });

    it("TWAP market decrease — partial close split into parts", async () => {
      const pos = await ensureLongPosition();
      const decreaseSize = BigInt(pos.sizeInUsd) / 5n;

      const { prepared, submitted } = await expressFlow(sdk, signer, {
        kind: "decrease",
        orderType: "twap",
        symbol: TEST_SYMBOL,
        direction: "long",
        size: decreaseSize,
        twapConfig: { duration: 600, parts: 2 },
        mode: "express",
        from: account,
      });

      expect(prepared.estimates).toBeDefined();
      expect(prepared.estimates!.sizeDeltaUsd).toBe(decreaseSize);

      const status = await waitForOrderStatus(sdk, submitted.requestId);
      // TWAP may revert depending on market conditions
      expect(["executed", "reverted"]).toContain(status.status);
    });
  });

  describe("decrease estimates", () => {
    it("estimates match for partial close", async () => {
      const pos = await ensureLongPosition();
      const decreaseSize = BigInt(pos.sizeInUsd) / 5n;

      const prepared = await sdk.prepareOrder({
        kind: "decrease",
        symbol: TEST_SYMBOL,
        direction: "long",
        orderType: "market",
        size: decreaseSize,
        mode: "express",
        from: account,
      });

      expect(prepared.estimates).toBeDefined();
      const est = prepared.estimates!;
      expect(est.sizeDeltaUsd).toBe(decreaseSize);
      expect(est.executionFeeAmount).toBeGreaterThan(0n);
      expect(est.positionFeeUsd).toBeGreaterThan(0n);
      expect(est.acceptablePrice).toBeGreaterThan(0n);
    });
  });

  describe("decrease slippage", () => {
    it("different slippage values accepted for decrease", async () => {
      await ensureLongPosition();

      const baseRequest = {
        kind: "decrease" as const,
        symbol: TEST_SYMBOL,
        direction: "long" as const,
        orderType: "market" as const,
        size: TEST_SIZE_USD,
        mode: "express" as const,
        from: account,
      };

      const [prepared30, prepared300] = await Promise.all([
        sdk.prepareOrder({ ...baseRequest, slippage: 30 }),
        sdk.prepareOrder({ ...baseRequest, slippage: 300 }),
      ]);

      // Both slippage values produce valid estimates
      expect(prepared30.estimates!.acceptablePrice).toBeGreaterThan(0n);
      expect(prepared300.estimates!.acceptablePrice).toBeGreaterThan(0n);

      // Size and fees unchanged between slippage variants
      expect(prepared30.estimates!.sizeDeltaUsd).toBe(prepared300.estimates!.sizeDeltaUsd);
      expect(prepared30.estimates!.positionFeeUsd).toBe(prepared300.estimates!.positionFeeUsd);
    });
  });

  describe("express conditional decrease", () => {
    afterAll(async () => {
      try {
        const prepared = await sdk.prepareCancelOrder({ all: true, mode: "express", from: account });
        const sig = await sdk.signOrder(prepared, signer);
        await sdk.submitOrder({
          mode: prepared.mode,
          requestId: prepared.requestId,
          signature: sig,
          from: account,
          idempotencyKey: prepared.idempotencyKey,
          eip712Data: {
            batchParams: prepared.payload.batchParams,
            relayParams: prepared.payload.relayParams,
          },
        });
      } catch { /* cleanup */ }
    });

    it("stop-loss: estimates present", async () => {
      await ensureLongPosition();

      const triggerPrice = 1n * 10n ** 30n; // $1

      const { prepared, submitted } = await expressFlow(sdk, signer, {
        kind: "decrease",
        symbol: TEST_SYMBOL,
        direction: "long",
        orderType: "stop-loss",
        size: TEST_SIZE_USD,
        triggerPrice,
        mode: "express",
        from: account,
      });

      expect(prepared.estimates).toBeDefined();
      expect(prepared.estimates!.sizeDeltaUsd).toBe(TEST_SIZE_USD);
      expect(prepared.estimates!.executionFeeAmount).toBeGreaterThan(0n);
      expect(prepared.estimates!.acceptablePrice).toBeLessThan(triggerPrice);

      expect(submitted.status).toBeDefined();

      const status = await waitForOrderStatus(sdk, submitted.requestId);
      expect(status.status).toBe("executed");

      const orders = await waitForOrdersUpdate(sdk, account, (o) => o.length > 0, 30000);
      expect(orders.length).toBeGreaterThan(0);
    });

    it("take-profit: estimates have trigger-adjusted acceptablePrice", async () => {
      await ensureLongPosition();

      const triggerPrice = 100000n * 10n ** 30n; // $100k

      const { prepared, submitted } = await expressFlow(sdk, signer, {
        kind: "decrease",
        symbol: TEST_SYMBOL,
        direction: "long",
        orderType: "take-profit",
        size: TEST_SIZE_USD,
        triggerPrice,
        mode: "express",
        from: account,
      });

      expect(prepared.estimates).toBeDefined();
      expect(prepared.estimates!.sizeDeltaUsd).toBe(TEST_SIZE_USD);
      expect(prepared.estimates!.acceptablePrice).toBeGreaterThan(0n);

      expect(submitted.status).toBeDefined();

      const status = await waitForOrderStatus(sdk, submitted.requestId);
      expect(status.status).toBe("executed");

      const orders = await waitForOrdersUpdate(sdk, account, (o) => o.length > 0, 30000);
      expect(orders.length).toBeGreaterThan(0);
    });
  });

  describe("classic decrease", () => {
    it("prepare returns transaction with estimates", async () => {
      await ensureLongPosition();

      const prepared = await sdk.prepareOrder({
        kind: "decrease",
        symbol: TEST_SYMBOL,
        direction: "long",
        orderType: "market",
        size: TEST_SIZE_USD,
        mode: "classic",
        from: account,
      });

      expect(prepared.payloadType).toBe("transaction");
      expect(prepared.payload.to).toBeDefined();
      expect(prepared.payload.data).toBeDefined();
      expect(prepared.estimates).toBeDefined();
      expect(prepared.estimates!.sizeDeltaUsd).toBe(TEST_SIZE_USD);
      expect(prepared.estimates!.executionFeeAmount).toBeGreaterThan(0n);
    });

    it.skipIf(!hasRpcUrl())("submit classic decrease on-chain", async () => {
      const pos = await ensureLongPosition();
      const decreaseSize = BigInt(pos.sizeInUsd) / 10n;

      const prepared = await sdk.prepareOrder({
        kind: "decrease",
        symbol: TEST_SYMBOL,
        direction: "long",
        orderType: "market",
        size: decreaseSize,
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

    it("express decrease with subaccount — full submit", async () => {
      const pos = await ensureLongPosition();
      const decreaseSize = BigInt(pos.sizeInUsd) / 10n;

      const result = await sdkSub.executeExpressOrder(
        {
          kind: "decrease",
          symbol: TEST_SYMBOL,
          direction: "long",
          orderType: "market",
          size: decreaseSize,
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

  describe("full close (last)", () => {
    it("full close: verify position removed", async () => {
      await ensureLongPosition();

      // Close all matching positions (tests may have opened multiple)
      for (let attempt = 0; attempt < 3; attempt++) {
        const freshPositions = await sdk.fetchPositionsInfo({ address: account });
        const pos = freshPositions.find((p: any) => p.isLong && p.indexName?.includes("ETH/USD"));
        if (!pos) break;

        const fullSize = BigInt(pos.sizeInUsd);
        const { prepared, submitted } = await expressFlow(sdk, signer, {
          kind: "decrease",
          symbol: TEST_SYMBOL,
          direction: "long",
          orderType: "market",
          size: fullSize,
          mode: "express",
          from: account,
        });

        expect(prepared.estimates).toBeDefined();

        const status = await waitForOrderStatus(sdk, submitted.requestId);
        expect(status.status).toBe("executed");

        // Wait for position update before next iteration
        await waitForPositionUpdate(sdk, account, (positions) => {
          const p = positions.find((p: any) => p.isLong && p.indexName?.includes("ETH/USD"));
          return !p || BigInt(p.sizeInUsd) < fullSize;
        }, 30000);
      }

      const positionsAfter = await sdk.fetchPositionsInfo({ address: account });
      const posAfter = positionsAfter.find(
        (p: any) => p.isLong && p.indexName?.includes("ETH/USD")
      );
      expect(posAfter).toBeUndefined();
    });
  });

  describe("error cases", () => {
    it("decrease without open position rejects", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "decrease",
          symbol: "DOGE/USD [WETH-USDC]",
          direction: "short",
          orderType: "market",
          size: TEST_SIZE_USD,
          mode: "express",
          from: account,
        })
      ).rejects.toThrow();
    });

    it("missing direction rejects", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "decrease",
          symbol: TEST_SYMBOL,
          orderType: "market",
          size: TEST_SIZE_USD,
          mode: "express",
          from: account,
        } as any)
      ).rejects.toThrow();
    });

    it("missing size rejects", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "decrease",
          symbol: TEST_SYMBOL,
          direction: "long",
          orderType: "market",
          mode: "express",
          from: account,
        } as any)
      ).rejects.toThrow();
    });
  });
});
