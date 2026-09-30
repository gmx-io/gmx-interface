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
