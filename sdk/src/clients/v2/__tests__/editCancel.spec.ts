import { describe, expect, it, afterAll } from "vitest";

import {
  getTestSdk,
  requireSigner,
  waitForOrderStatus,
  waitForOrdersUpdate,
  activateTestSubaccount,
  TEST_SYMBOL,
  TEST_SIZE_USD,
  TEST_COLLATERAL,
} from "./testUtil";

const sdk = getTestSdk();
const signer = requireSigner();
const account = signer.address;

const LIMIT_TRIGGER_PRICE = 1n * 10n ** 30n; // $1
const LIMIT_TRIGGER_PRICE_2 = 2n * 10n ** 30n; // $2

async function signAndSubmit(sdk: ReturnType<typeof getTestSdk>, prepared: any) {
  const sig = await sdk.signOrder(prepared, signer);
  return sdk.submitOrder({
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
}

async function createLimitOrder(sdkInstance: ReturnType<typeof getTestSdk>, triggerPrice = LIMIT_TRIGGER_PRICE) {
  const result = await sdkInstance.executeExpressOrder(
    {
      kind: "increase",
      symbol: TEST_SYMBOL,
      direction: "long",
      orderType: "limit",
      size: TEST_SIZE_USD,
      triggerPrice,
      collateralToPay: TEST_COLLATERAL,
      mode: "express",
      from: account,
    },
    signer
  );

  const status = await waitForOrderStatus(sdkInstance, result.requestId);
  expect(status.status).toBe("executed");
  return result;
}


describe("edit & cancel orders", () => {
  afterAll(async () => {
    try {
      const prepared = await sdk.prepareCancelOrder({ all: true, mode: "express", from: account });
      await signAndSubmit(sdk, prepared);
    } catch {
      // cleanup best-effort
    }
  });


  describe("create → edit → cancel (express)", () => {
    let createdOrderKey: string;

    it("create limit order", async () => {
      const ordersBefore = await sdk.fetchOrders({ address: account });
      const countBefore = ordersBefore.length;

      await createLimitOrder(sdk);

      const ordersAfter = await waitForOrdersUpdate(sdk, account, (o) => o.length > countBefore, 30000);
      expect(ordersAfter.length).toBeGreaterThan(countBefore);

      createdOrderKey = ordersAfter[ordersAfter.length - 1].key;
    });

    it("verify order fields match request", async () => {
      const orders = await sdk.fetchOrders({ address: account });
      expect(orders.length).toBeGreaterThan(0);

      const order = orders.find((o: any) => o.key === createdOrderKey) ?? orders[0];
      expect(BigInt(order.sizeDeltaUsd)).toBe(BigInt(TEST_SIZE_USD));
      expect(order.isLong).toBe(true);
      expect(BigInt(order.executionFee)).toBeGreaterThan(0n);
      expect(BigInt(order.initialCollateralDeltaAmount)).toBeGreaterThan(0n);
    });

    it("edit order trigger price", async () => {
      const orders = await sdk.fetchOrders({ address: account });
      expect(orders.length).toBeGreaterThan(0);

      const orderId = (orders.find((o: any) => o.key === createdOrderKey) ?? orders[0]).key;
      const triggerBefore = BigInt(orders.find((o: any) => o.key === orderId)!.triggerPrice);

      const prepared = await sdk.prepareEditOrder({
        orderIds: [orderId],
        newTriggerPrice: LIMIT_TRIGGER_PRICE_2,
        mode: "express",
        from: account,
      });

      expect(prepared.payloadType).toBe("typed-data");

      const submitted = await signAndSubmit(sdk, prepared);
      expect(submitted.status).toBeDefined();

      const status = await waitForOrderStatus(sdk, submitted.requestId);
      expect(status.status).toBe("executed");

      const ordersAfter = await waitForOrdersUpdate(sdk, account, (ords) => {
        const edited = ords.find((o: any) => o.key === orderId);
        return edited ? BigInt(edited.triggerPrice) !== triggerBefore : false;
      }, 30000);
      const editedOrder = ordersAfter.find((o: any) => o.key === orderId);
      expect(editedOrder).toBeDefined();
      expect(BigInt(editedOrder!.triggerPrice)).not.toBe(triggerBefore);
    });

    it("cancel order: verify order removed", async () => {
      const orders = await sdk.fetchOrders({ address: account });
      expect(orders.length).toBeGreaterThan(0);

      const orderId = (orders.find((o: any) => o.key === createdOrderKey) ?? orders[0]).key;

      const prepared = await sdk.prepareCancelOrder({
        orderIds: [orderId],
        mode: "express",
        from: account,
      });

      expect(prepared.payloadType).toBe("typed-data");

      const submitted = await signAndSubmit(sdk, prepared);
      expect(submitted.status).toBeDefined();

      const status = await waitForOrderStatus(sdk, submitted.requestId);
      expect(status.status).toBe("executed");

      const ordersAfter = await waitForOrdersUpdate(sdk, account, (ords) => {
        return !ords.find((o: any) => o.key === orderId);
      }, 30000);
      expect(ordersAfter.find((o: any) => o.key === orderId)).toBeUndefined();
    });
  });


  describe("cancel all orders", () => {
    it("create two limit orders", async () => {
      const ordersBefore = await sdk.fetchOrders({ address: account });
      const countBefore = ordersBefore.length;

      await createLimitOrder(sdk, LIMIT_TRIGGER_PRICE);
      await createLimitOrder(sdk, LIMIT_TRIGGER_PRICE_2);

      const ordersAfter = await waitForOrdersUpdate(sdk, account, (o) => o.length >= countBefore + 2, 30000);
      expect(ordersAfter.length).toBeGreaterThanOrEqual(countBefore + 2);
    });

    it("cancel all at once", async () => {
      const prepared = await sdk.prepareCancelOrder({
        all: true,
        mode: "express",
        from: account,
      });

      expect(prepared.payloadType).toBe("typed-data");

      const submitted = await signAndSubmit(sdk, prepared);
      expect(submitted.status).toBeDefined();

      const status = await waitForOrderStatus(sdk, submitted.requestId);
      expect(status.status).toBe("executed");
    });
  });


  describe("1CT edit + cancel", () => {
    const sdkSub = getTestSdk();

    afterAll(async () => {
      try {
        const prepared = await sdk.prepareCancelOrder({ all: true, mode: "express", from: account });
        await signAndSubmit(sdk, prepared);
      } catch { /* cleanup */ }
      sdkSub.clearSubaccount();
    });

    it("edit with subaccount — full submit", async () => {
      // Always create a fresh order to avoid stale state from previous blocks
      const ordersBefore = await sdk.fetchOrders({ address: account });
      const countBefore = ordersBefore.length;
      await createLimitOrder(sdk);
      const ordersAfter = await waitForOrdersUpdate(sdk, account, (o) => o.length > countBefore, 30000);
      const orderId = ordersAfter[ordersAfter.length - 1].key;
      const triggerBefore = BigInt(ordersAfter[ordersAfter.length - 1].triggerPrice);

      // Activate subaccount AFTER order creation so nonce is fresh
      await activateTestSubaccount(sdkSub, signer, account);

      const prepared = await sdkSub.prepareEditOrder({
        orderIds: [orderId],
        newTriggerPrice: LIMIT_TRIGGER_PRICE_2,
        mode: "express",
        from: account,
        subaccountAddress: sdkSub.subaccountAddress,
        subaccountApproval: sdkSub.subaccountApprovalMessage,
      });

      expect(prepared.payloadType).toBe("typed-data");

      const signature = await sdkSub.signOrder(prepared, signer);
      const submitted = await sdkSub.submitOrder({
        mode: prepared.mode,
        requestId: prepared.requestId,
        signature,
        from: account,
        idempotencyKey: prepared.idempotencyKey,
        eip712Data: {
          batchParams: prepared.payload.batchParams,
          relayParams: prepared.payload.relayParams,
          subaccountApproval: sdkSub.subaccountApprovalMessage,
        },
      });

      expect(submitted.requestId).toBeDefined();

      const status = await waitForOrderStatus(sdk, submitted.requestId);
      expect(status.status).toBe("executed");

      const updatedOrders = await waitForOrdersUpdate(sdk, account, (ords) => {
        const edited = ords.find((o: any) => o.key === orderId);
        return edited ? BigInt(edited.triggerPrice) !== triggerBefore : false;
      }, 30000);
      const editedOrder = updatedOrders.find((o: any) => o.key === orderId);
      expect(editedOrder).toBeDefined();
      expect(BigInt(editedOrder!.triggerPrice)).not.toBe(triggerBefore);
    });

    it("cancel with subaccount — full submit", async () => {
      // Always create a fresh order
      const ordersBefore = await sdk.fetchOrders({ address: account });
      const countBefore = ordersBefore.length;
      await createLimitOrder(sdk);
      const ordersAfter = await waitForOrdersUpdate(sdk, account, (o) => o.length > countBefore, 30000);
      const orderId = ordersAfter[ordersAfter.length - 1].key;

      // Re-activate for fresh nonce (edit test registered the old approval)
      await activateTestSubaccount(sdkSub, signer, account);

      const prepared = await sdkSub.prepareCancelOrder({
        orderIds: [orderId],
        mode: "express",
        from: account,
        subaccountAddress: sdkSub.subaccountAddress,
        subaccountApproval: sdkSub.subaccountApprovalMessage,
      });

      expect(prepared.payloadType).toBe("typed-data");

      const signature = await sdkSub.signOrder(prepared, signer);
      const submitted = await sdkSub.submitOrder({
        mode: prepared.mode,
        requestId: prepared.requestId,
        signature,
        from: account,
        idempotencyKey: prepared.idempotencyKey,
        eip712Data: {
          batchParams: prepared.payload.batchParams,
          relayParams: prepared.payload.relayParams,
          subaccountApproval: sdkSub.subaccountApprovalMessage,
        },
      });

      expect(submitted.requestId).toBeDefined();

      const status = await waitForOrderStatus(sdk, submitted.requestId);
      expect(status.status).toBe("executed");

      const updatedOrders = await waitForOrdersUpdate(sdk, account, (ords) => {
        return !ords.find((o: any) => o.key === orderId);
      }, 30000);
      expect(updatedOrders.find((o: any) => o.key === orderId)).toBeUndefined();
    });
  });


  describe("error cases", () => {
    it("edit with empty orderIds rejects", async () => {
      await expect(
        sdk.prepareEditOrder({
          orderIds: [],
          newTriggerPrice: LIMIT_TRIGGER_PRICE_2,
          mode: "express",
          from: account,
        })
      ).rejects.toThrow();
    });

    it("edit without any edit fields rejects", async () => {
      await expect(
        sdk.prepareEditOrder({
          orderIds: ["0x0000000000000000000000000000000000000000000000000000000000000001"],
          mode: "express",
          from: account,
        })
      ).rejects.toThrow();
    });

    it("cancel nonexistent orderId rejects", async () => {
      await expect(
        sdk.prepareCancelOrder({
          orderIds: ["0x0000000000000000000000000000000000000000000000000000000000000001"],
          mode: "express",
          from: account,
        })
      ).rejects.toThrow();
    });

    it("edit nonexistent orderId rejects", async () => {
      await expect(
        sdk.prepareEditOrder({
          orderIds: ["0x0000000000000000000000000000000000000000000000000000000000000001"],
          newTriggerPrice: LIMIT_TRIGGER_PRICE_2,
          mode: "express",
          from: account,
        })
      ).rejects.toThrow();
    });
  });
});
