import { describe, expect, it } from "vitest";

import type { OrderStatusResponse } from "utils/orderTransactions/api";

import { GmxApiSdk } from "../index";
import {
  getTestSdk,
  RecordingApi,
  requireSigner,
  TEST_CHAIN_ID,
  TEST_COLLATERAL,
  TEST_SIZE_USD,
  TEST_SYMBOL,
} from "./testUtil";

const signer = requireSigner();

const LIMIT_TRIGGER_PRICE = 1n * 10n ** 30n;

async function waitForSubaccountNoopApproval(sdk: GmxApiSdk, account: string): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 30000) {
    await sdk.refreshSubaccountState(account);

    if (sdk.subaccountApprovalMessage?.signature === "0x") {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error("Timed out waiting for subaccount approval to sync on-chain");
}

async function waitForOrderCreatedOrExecuted(sdk: GmxApiSdk, requestId: string): Promise<OrderStatusResponse> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 180000) {
    const status = await sdk.fetchOrderStatus({ requestId });

    if (
      status.status === "created" ||
      status.status === "executed" ||
      status.status === "cancelled" ||
      status.status === "relay_failed" ||
      status.status === "relay_reverted"
    ) {
      return status;
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  return sdk.fetchOrderStatus({ requestId });
}

describe("GmxApiSdk — subaccount (1CT) live flow", () => {
  it("e2e applies approval once and uses noop approval for the next order", async () => {
    const account = signer.address;
    const recordingApi = new RecordingApi(getTestSdk().ctx.api);
    const sdkSub = new GmxApiSdk({ chainId: TEST_CHAIN_ID, api: recordingApi });
    const cleanupSdk = new GmxApiSdk({ chainId: TEST_CHAIN_ID, api: recordingApi });

    try {
      const subaccountAddress = await sdkSub.generateSubaccount(signer);
      const statusBefore = await sdkSub.refreshSubaccountState(account);

      await sdkSub.activateSubaccount(signer, {
        expiresInSeconds: 86400,
        maxAllowedCount: (statusBefore?.maxAllowedCount ?? 0n) + 2n,
      });

      const signedApproval = sdkSub.subaccountApprovalMessage;
      expect(signedApproval).toBeDefined();
      expect(signedApproval!.signature).not.toBe("0x");

      const first = await sdkSub.executeExpressOrder(
        {
          kind: "increase",
          symbol: TEST_SYMBOL,
          direction: "long",
          orderType: "limit",
          size: TEST_SIZE_USD,
          triggerPrice: LIMIT_TRIGGER_PRICE,
          collateralToken: "USDC",
          collateralToPay: TEST_COLLATERAL,
          mode: "express",
          from: account,
        },
        signer
      );

      expect(first.requestId).toBeDefined();
      const firstStatus = await waitForOrderCreatedOrExecuted(sdkSub, first.requestId);
      expect(["created", "executed"]).toContain(firstStatus.status);

      expect(recordingApi.orderPrepareRequests[0].subaccountAddress).toBe(subaccountAddress);
      expect(recordingApi.orderPrepareRequests[0].subaccountApproval?.signature).toBe(signedApproval!.signature);
      expect(recordingApi.orderSubmitRequests[0].eip712Data?.subaccountApproval?.signature).toBe(
        signedApproval!.signature
      );

      await waitForSubaccountNoopApproval(sdkSub, account);

      const staleApproval = signedApproval!;
      await sdkSub.prepareOrder({
        kind: "increase",
        symbol: TEST_SYMBOL,
        direction: "long",
        orderType: "limit",
        size: TEST_SIZE_USD,
        triggerPrice: LIMIT_TRIGGER_PRICE,
        collateralToken: "USDC",
        collateralToPay: TEST_COLLATERAL,
        mode: "express",
        from: account,
        subaccountAddress,
        subaccountApproval: staleApproval,
      });

      expect(recordingApi.orderPrepareRequests[1].subaccountApproval?.signature).toBe("0x");
    } finally {
      try {
        const prepared = await cleanupSdk.prepareCancelOrder({ all: true, mode: "express", from: account });
        const cancelSignature = await cleanupSdk.signOrder(prepared, signer);
        await cleanupSdk.submitOrder({
          mode: prepared.mode,
          requestId: prepared.requestId,
          signature: cancelSignature,
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
      sdkSub.clearSubaccount();
    }
  }, 300000);
});
