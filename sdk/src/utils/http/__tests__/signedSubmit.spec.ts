import { describe, expect, it, vi } from "vitest";

import { getSignedCrossChainWithdrawSubmit, getSignedOrderSubmit, GmxApiSdk, HttpError } from "clients/v2";
import { ARBITRUM, SOURCE_BASE_MAINNET } from "configs/chains";
import { getContract } from "configs/contracts";

const fetchMock = vi.hoisted(() => vi.fn());
vi.mock("cross-fetch", () => ({ default: fetchMock }));

const ACCOUNT = "0x1234567890123456789012345678901234567890";
const ROUTER = getContract(ARBITRUM, "SubaccountGelatoRelayRouter");
const typedData = {
  domain: { name: "GmxBaseGelatoRelayRouter", version: "1", chainId: ARBITRUM, verifyingContract: ROUTER },
  types: { Batch: [{ name: "deadline", type: "uint256" }] },
  message: { deadline: "100" },
};
const gasPaymentParams = {
  relayerFeeTokenAddress: ROUTER,
  relayerFeeAmount: "1",
  gasPaymentTokenAddress: ROUTER,
  gasPaymentTokenAmount: "1",
};
const answers: Record<string, unknown> = {
  "/v1/subaccounts/status": {
    active: true,
    maxAllowedCount: "10",
    currentActionsCount: "0",
    remainingActions: "10",
    expiresAt: "4102444800",
    approvalNonce: "0",
    multichainApprovalNonce: "0",
    integrationId: null,
  },
  "/v1/orders/txns/prepare": {
    requestId: "order-1",
    payloadType: "typed-data",
    mode: "express",
    payload: { typedData, batchParams: {}, relayParams: { deadline: "100" } },
  },
  "/v1/gmx-account/withdraw/cross-chain/prepare": {
    requestId: "withdraw-1",
    payloadType: "typed-data",
    payload: { typedData, relayParams: { deadline: "100" }, relayRouterAddress: ROUTER, gasPaymentParams },
    expiresAt: 100,
  },
};
const signer = {
  address: ACCOUNT,
  signTypedData: async () => "0x" + "11".repeat(65),
  signMessage: async () => "0x" + "22".repeat(65),
};

function toWire(body: unknown) {
  return JSON.stringify(body, (_key, value) => (typeof value === "bigint" ? value.toString() : value));
}

describe("express submit failures", () => {
  it("rethrow the submit error with the exact signed body", async () => {
    const networkError = new TypeError("fetch failed");
    const submitted: string[] = [];
    fetchMock.mockImplementation(async (url: string, init: { body: string }) => {
      const { pathname } = new URL(url);
      if (!pathname.endsWith("/submit")) return new Response(JSON.stringify(answers[pathname]));
      submitted.push(init.body);
      if (pathname.startsWith("/v1/orders")) throw networkError;
      return new Response(JSON.stringify({ message: "busy" }), { status: 503 });
    });
    const sdk = new GmxApiSdk({ chainId: ARBITRUM, apiUrl: "http://api" });
    const subaccount = await sdk.generateSubaccount(signer);

    const orderError = await sdk
      .executeExpressOrder({ kind: "swap", orderType: "market", mode: "express", from: ACCOUNT }, signer)
      .catch((error) => error);
    const order = getSignedOrderSubmit(orderError);
    expect(orderError).toBe(networkError);
    expect(order?.submitRequest.eip712Data?.subaccountApproval?.subaccount).toBe(subaccount);
    expect(toWire(order?.submitRequest)).toBe(submitted[0]);

    const bridgeOutParams = { token: ROUTER, amount: 5n, minAmountOut: 4n, provider: ROUTER, data: "0x" };
    const withdrawError = await sdk
      .executeCrossChainWithdraw(signer, { srcChainId: SOURCE_BASE_MAINNET, account: ACCOUNT, bridgeOutParams })
      .catch((error) => error);
    const withdraw = getSignedCrossChainWithdrawSubmit(withdrawError);
    expect(withdrawError).toBeInstanceOf(HttpError);
    expect(withdrawError.statusCode).toBe(503);
    expect(withdraw?.prepared.requestId).toBe("withdraw-1");
    expect(toWire(withdraw?.submitRequest)).toBe(submitted[1]);
  });
});
