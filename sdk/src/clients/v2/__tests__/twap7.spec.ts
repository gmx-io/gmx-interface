/* eslint-disable no-console */
import { describe, expect, it, afterAll } from "vitest";

import {
  getTestSdk,
  requireSigner,
  waitForOrderStatus,
  expressFlow,
  TEST_SYMBOL,
} from "./testUtil";

const sdk = getTestSdk();
const signer = requireSigner();
const account = signer.address;

describe("TWAP 7 parts", () => {
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

  it("check balance", async () => {
    const balances = await sdk.fetchWalletBalances({ address: account });
    const usdc = balances.find((t: any) => t.symbol === "USDC");
    console.log("USDC:", usdc ? (Number(usdc.balance) / 1e6).toFixed(2) : "0");
  });

  it("simple market increase — log payload", async () => {
    const prepared = await sdk.prepareOrder({
      kind: "increase",
      orderType: "market",
      symbol: TEST_SYMBOL,
      direction: "long",
      size: 100n * 10n ** 30n,
      collateralToPay: { amount: 5_000_000n, token: "USDC" },
      mode: "express",
      from: account,
    });
    console.log("=== MARKET PAYLOAD ===");
    console.log("relayRouterAddress:", prepared.payload?.relayRouterAddress);
    console.log("gasLimit:", prepared.payload?.gasLimit);
    console.log("gasPrice:", prepared.payload?.gasPrice);
    console.log("gasPaymentParams:", JSON.stringify(prepared.payload?.gasPaymentParams, (_, v) => typeof v === "bigint" ? v.toString() : v));
    console.log("executionFeeAmount:", prepared.payload?.executionFeeAmount?.toString());
    console.log("relayerFeeAmount:", prepared.payload?.relayerFeeAmount?.toString());
    console.log("relayParams.fee:", JSON.stringify(prepared.payload?.relayParams?.fee, (_, v) => typeof v === "bigint" ? v.toString() : v));
    console.log("typedData.domain:", JSON.stringify(prepared.payload?.typedData?.domain));
    console.log("createOrderParamsList count:", prepared.payload?.batchParams?.createOrderParamsList?.length ?? prepared.payload?.batchParams?.createOrderParams?.length ?? "N/A");
    const orderList = prepared.payload?.batchParams?.createOrderParamsList ?? prepared.payload?.batchParams?.createOrderParams;
    if (orderList && orderList[0]) {
      const first = orderList[0];
      console.log("first.numbers:", JSON.stringify(first.numbers, (_, v) => typeof v === "bigint" ? v.toString() : v));
      console.log("first.orderType:", first.orderType);
      console.log("first.addresses:", JSON.stringify(first.addresses));
    }
    // Don't actually submit to save USDC
  });

  it("TWAP increase 2 parts — minimal", async () => {
    const { submitted } = await expressFlow(sdk, signer, {
      kind: "increase",
      orderType: "twap",
      symbol: TEST_SYMBOL,
      direction: "long",
      size: 100n * 10n ** 30n,
      collateralToPay: { amount: 4_000_000n, token: "USDC" },
      twapConfig: { duration: 120, parts: 2 },
      mode: "express",
      from: account,
    });

    console.log("Submit:", submitted.status, submitted.requestId);
    const status = await waitForOrderStatus(sdk, submitted.requestId, 120000);
    console.log("Status:", status.status, status.txHash ?? "");
    expect(["executed", "reverted"]).toContain(status.status);

    if (status.status === "reverted" && status.txHash) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, import/no-extraneous-dependencies
      const { ethers } = require("ethers");
      const provider = new ethers.JsonRpcProvider("https://arb1.arbitrum.io/rpc");
      const tx = await provider.getTransaction(status.txHash);
      const receipt = await provider.getTransactionReceipt(status.txHash);
      console.log("Gas limit:", tx.gasLimit.toString());
      console.log("Gas used:", receipt.gasUsed.toString());
      console.log("Logs:", receipt.logs.length);

      // Try to get revert reason via call
      try {
        await provider.call({ to: tx.to, data: tx.data, from: tx.from }, receipt.blockNumber);
        console.log("Call succeeded (state changed)");
      } catch (e: any) {
        console.log("Revert reason:", e.data?.slice(0, 200) ?? e.message?.slice(0, 200));
      }
    }
  });
});
