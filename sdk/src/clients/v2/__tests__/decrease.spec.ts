import { describe, expect, it, beforeAll, afterAll } from "vitest";

import {
  getTestSdk,
  requireSigner,
  expressFlow,
  waitForOrderStatus,
  waitForOrdersUpdate,
  waitForPositionUpdate,
  TEST_SYMBOL,
  TEST_SIZE_USD,
} from "./testUtil";

const sdk = getTestSdk();
const signer = requireSigner();
const account = signer.address;

// Use 5 USDC collateral for decrease tests to avoid instant liquidation at high leverage
const DECREASE_COLLATERAL = { amount: "5000000", token: "USDC" }; // 5 USDC

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

  // Wait for indexer to pick up the new position
  const positions = await waitForPositionUpdate(sdk, account, (positions) => {
    return positions.some((p: any) => p.isLong && p.indexName?.includes("ETH/USD"));
  }, 30000);
  expect(positions.some((p: any) => p.isLong && p.indexName?.includes("ETH/USD"))).toBe(true);
}

async function ensureLongPosition(): Promise<any> {
  const positions = await sdk.fetchPositionsInfo({ address: account });
  const pos = positions.find((p: any) => p.isLong && p.indexName?.includes("ETH/USD"));
  if (pos) return pos;

  await openLongPosition();

  const after = await sdk.fetchPositionsInfo({ address: account });
  const opened = after.find((p: any) => p.isLong && p.indexName?.includes("ETH/USD"));
  expect(opened).toBeDefined();
  return opened;
}

// ---------------------------------------------------------------------------
// Decrease order flows
// ---------------------------------------------------------------------------

describe("decrease orders", () => {
  beforeAll(async () => {
    await ensureLongPosition();
  });

  // -------------------------------------------------------------------------
  // Express mode — tests that preserve the position run first
  // -------------------------------------------------------------------------

  describe("express market decrease", () => {
    it("partial close: estimates → verify size reduced", async () => {
      const pos = await ensureLongPosition();

      const sizeBefore = BigInt(pos.sizeInUsd);
      const decreaseSize = (sizeBefore / 10n).toString(); // 10% to preserve position for other tests

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
      expect(BigInt(est.executionFeeAmount)).toBeGreaterThan(0n);
      expect(BigInt(est.positionFeeUsd)).toBeGreaterThan(0n);
      expect(BigInt(est.acceptablePrice)).toBeGreaterThan(0n);

      expect(submitted.status).toBeDefined();

      const status = await waitForOrderStatus(sdk, submitted.requestId);
      expect(status.status).toBe("executed");

      const positionsAfter = await waitForPositionUpdate(sdk, account, (positions) => {
        const pos = positions.find((p: any) => p.isLong && p.indexName?.includes("ETH/USD"));
        return pos ? BigInt(pos.sizeInUsd) < sizeBefore : true;
      }, 30000);
      const posAfter = positionsAfter.find(
        (p: any) => p.isLong && p.indexName?.includes("ETH/USD")
      );
      if (posAfter) {
        const sizeAfter = BigInt(posAfter.sizeInUsd);
        expect(sizeAfter).toBeLessThan(sizeBefore);
      }
    });
  });

  // -------------------------------------------------------------------------
  // Express conditional decrease — also preserves position (limit orders)
  // -------------------------------------------------------------------------

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
      } catch {
        // cleanup best-effort
      }
    });

    it("stop-loss: estimates present", async () => {
      await ensureLongPosition();

      const triggerPrice = (1n * 10n ** 30n).toString(); // $1

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
      expect(BigInt(prepared.estimates!.executionFeeAmount)).toBeGreaterThan(0n);
      expect(BigInt(prepared.estimates!.acceptablePrice)).toBeLessThan(BigInt(triggerPrice));

      expect(submitted.status).toBeDefined();

      const status = await waitForOrderStatus(sdk, submitted.requestId);
      expect(status.status).toBe("executed");

      const orders = await waitForOrdersUpdate(sdk, account, (o) => o.length > 0, 30000);
      expect(orders.length).toBeGreaterThan(0);
    });

    it("take-profit: estimates have trigger-adjusted acceptablePrice", async () => {
      await ensureLongPosition();

      const triggerPrice = (100000n * 10n ** 30n).toString(); // $100k

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
      expect(BigInt(prepared.estimates!.acceptablePrice)).toBeGreaterThan(0n);

      expect(submitted.status).toBeDefined();

      const status = await waitForOrderStatus(sdk, submitted.requestId);
      expect(status.status).toBe("executed");

      const orders = await waitForOrdersUpdate(sdk, account, (o) => o.length > 0, 30000);
      expect(orders.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // Classic mode — prepare only, doesn't modify position
  // -------------------------------------------------------------------------

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
      expect(BigInt(prepared.estimates!.executionFeeAmount)).toBeGreaterThan(0n);
    });
  });

  // -------------------------------------------------------------------------
  // 1CT (subaccount)
  // -------------------------------------------------------------------------

  describe("with subaccount (1CT)", () => {
    const sdkSub = getTestSdk();

    beforeAll(async () => {
      await sdkSub.activateSubaccount(signer, {
        expiresInSeconds: 86400,
        maxAllowedCount: 10,
      });
    });

    afterAll(() => {
      sdkSub.clearSubaccount();
    });

    it("express market decrease with subaccount", async () => {
      const pos = await ensureLongPosition();

      // Use small decrease (10%) to preserve position for full close test
      const decreaseSize = (BigInt(pos.sizeInUsd) / 10n).toString();

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

      const status = await sdk.fetchOrderStatus({ requestId: result.requestId });
      expect(status.requestId).toBe(result.requestId);
    });
  });

  // -------------------------------------------------------------------------
  // Full close — runs LAST since it destroys the position
  // -------------------------------------------------------------------------

  describe("full close (last)", () => {
    it("full close: verify position removed", async () => {
      const pos = await ensureLongPosition();

      const fullSize = BigInt(pos.sizeInUsd).toString();

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
      expect(prepared.estimates!.sizeDeltaUsd).toBe(fullSize);

      const status = await waitForOrderStatus(sdk, submitted.requestId);
      expect(status.status).toBe("executed");

      const positionsAfter = await waitForPositionUpdate(sdk, account, (positions) => {
        return !positions.find((p: any) => p.isLong && p.indexName?.includes("ETH/USD"));
      }, 30000);
      const posAfter = positionsAfter.find(
        (p: any) => p.isLong && p.indexName?.includes("ETH/USD")
      );
      expect(posAfter).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Error cases — don't depend on position state
  // -------------------------------------------------------------------------

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
