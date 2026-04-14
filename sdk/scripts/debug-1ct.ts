import { ARBITRUM, getViemChain } from "configs/chains";
import { PrivateKeySigner } from "utils/signer";
import { GmxApiSdk } from "clients/v2/index";

const TEST_CHAIN_ID = ARBITRUM;
const TEST_SYMBOL = "ETH/USD [WETH-USDC]";
const TEST_SIZE_USD = 100n * 10n ** 30n;
const TEST_COLLATERAL = { amount: 1000000n, token: "USDC" };

async function main() {
  const pk = process.env.GMX_TEST_PRIVATE_KEY;
  const apiUrl = process.env.GMX_TEST_API_URL;
  const rpcUrl = process.env.GMX_TEST_RPC_URL;

  if (!pk) throw new Error("GMX_TEST_PRIVATE_KEY required");

  const signer = new PrivateKeySigner(
    pk as `0x${string}`,
    rpcUrl ? { rpcUrl, chain: getViemChain(TEST_CHAIN_ID) } : undefined
  );
  const account = signer.address;

  const sdk = new GmxApiSdk({ chainId: TEST_CHAIN_ID, ...(apiUrl && { apiUrl }) });

  console.log("=== 1. Account ===");
  console.log("Main account:", account);

  console.log("\n=== 2. Generate subaccount ===");
  const subAddr = await sdk.generateSubaccount(signer);
  console.log("Subaccount address:", subAddr);

  console.log("\n=== 3. Fetch subaccount status BEFORE activation ===");
  const statusBefore = await sdk.fetchSubaccountStatus({ account, subaccountAddress: subAddr });
  console.log("Status:", JSON.stringify(statusBefore, null, 2));

  // Use maxAllowedCount higher than currentActionsCount to avoid contract revert
  const neededCount = Number(statusBefore.currentActionsCount) + 50;
  console.log("\n=== 4. Activate subaccount (maxAllowedCount:", neededCount, ") ===");
  const activatedAddr = await sdk.activateSubaccount(signer, {
    expiresInSeconds: 86400,
    maxAllowedCount: neededCount,
  });
  console.log("Activated address:", activatedAddr);
  console.log("hasActiveSubaccount:", sdk.hasActiveSubaccount);
  console.log("subaccountApprovalMessage:", JSON.stringify(sdk.subaccountApprovalMessage, null, 2));

  console.log("\n=== 5. Fetch subaccount status AFTER activation ===");
  const statusAfter = await sdk.fetchSubaccountStatus({ account, subaccountAddress: subAddr });
  console.log("Status:", JSON.stringify(statusAfter, null, 2));

  console.log("\n=== 6. Prepare order WITH subaccount ===");
  try {
    const prepared = await sdk.prepareOrder({
      kind: "increase",
      symbol: TEST_SYMBOL,
      direction: "long",
      orderType: "market",
      size: TEST_SIZE_USD,
      collateralToPay: TEST_COLLATERAL,
      mode: "express",
      from: account,
      subaccountAddress: sdk.subaccountAddress,
      subaccountApproval: sdk.subaccountApprovalMessage,
    });

    console.log("Prepared requestId:", prepared.requestId);
    console.log("Prepared payloadType:", prepared.payloadType);
    console.log("Prepared mode:", prepared.mode);
    console.log("TypedData domain:", JSON.stringify(prepared.payload.typedData?.domain, null, 2));
    console.log("TypedData message keys:", Object.keys(prepared.payload.typedData?.message || {}));
    console.log("RelayParams keys:", Object.keys(prepared.payload.relayParams || {}));
    console.log("Estimates:", prepared.estimates);

    console.log("\n=== 7. Sign order with subaccount signer ===");
    const signature = await sdk.signOrder(prepared, signer);
    console.log("Signature:", signature.substring(0, 20) + "...");

    console.log("\n=== 8. Submit order ===");
    const submitPayload = {
      mode: prepared.mode,
      requestId: prepared.requestId,
      signature,
      from: account,
      idempotencyKey: prepared.idempotencyKey,
      eip712Data: {
        batchParams: prepared.payload.batchParams,
        relayParams: prepared.payload.relayParams,
        subaccountApproval: sdk.subaccountApprovalMessage,
      },
    };
    console.log("Submit from:", submitPayload.from);
    console.log("Submit has subaccountApproval:", !!submitPayload.eip712Data.subaccountApproval);

    const submitted = await sdk.submitOrder(submitPayload);
    console.log("Submitted:", JSON.stringify(submitted, null, 2));
  } catch (e: any) {
    console.error("ERROR:", e.message);
    if (e.body) console.error("Response body:", JSON.stringify(e.body, null, 2));
  }

  console.log("\n=== 9. Try executeExpressOrder (auto flow) ===");
  try {
    const result = await sdk.executeExpressOrder(
      {
        kind: "increase",
        symbol: TEST_SYMBOL,
        direction: "long",
        orderType: "market",
        size: TEST_SIZE_USD,
        collateralToPay: TEST_COLLATERAL,
        mode: "express",
        from: account,
      },
      signer
    );
    console.log("Result:", JSON.stringify(result, null, 2));
  } catch (e: any) {
    console.error("ERROR:", e.message);
    if (e.body) console.error("Response body:", JSON.stringify(e.body, null, 2));
  }

  sdk.clearSubaccount();
}

main().catch(console.error);
