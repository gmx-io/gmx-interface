// @ts-nocheck

import { Signer, ethers } from "ethers";
import { debugPermitSignature, createTokenPermit } from "../permitUtils";

/**
 * Debug token permits for a specific token and signer
 * This will run a full diagnostic to help troubleshoot EIP-2612 "invalid signature" errors
 *
 * @param token The token address to test
 * @param signer The signer to use
 * @param chainId The chain ID
 * @param spender The spender address (optional, defaults to Router contract)
 */
export async function runPermitDiagnostic(token: string, signer: Signer, chainId: number, spender?: string) {
  console.log("========== PERMIT DIAGNOSTIC TOOL ==========");
  console.log(`Testing token: ${token}`);
  console.log(`Chain ID: ${chainId}`);

  // Make sure we have a provider
  if (!signer.provider) {
    console.error("Signer must be connected to a provider");
    return;
  }

  const owner = await signer.getAddress();
  console.log(`Signer address: ${owner}`);

  // Step 1: Check if the token supports permits
  console.log("\n➡️ Step 1: Checking permit support");
  const diagnosticResult = await debugPermitSignature(token, signer, signer.provider, chainId);

  if (!diagnosticResult) {
    console.error("❌ Basic permit diagnostics failed. Token likely doesn't support EIP-2612 permits properly.");
    return;
  }

  // Step 2: Try to create a permit
  console.log("\n➡️ Step 2: Creating test permit");

  if (!spender) {
    try {
      const { chainRpcConfig } = await import("config/chains");
      // Try to get Router contract from your config
      spender = chainRpcConfig[chainId].contracts.Router;
    } catch (error) {
      // Fallback to zero address if config not found
      spender = ethers.ZeroAddress;
    }
  }

  console.log(`Using spender: ${spender}`);

  try {
    // Create a test permit with a minimal value
    const testAmount = 1n;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour

    const permit = await createTokenPermit(signer, token, spender, testAmount, deadline, chainId);

    console.log("✅ Successfully created permit signature:");
    console.log(JSON.stringify(permit, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2));

    // Verify the signature format
    console.log("\n➡️ Step 3: Validating signature format");
    if (!permit.r || !permit.s || permit.v === undefined) {
      console.error("❌ Signature components are missing or invalid");
    } else if (permit.v !== 27 && permit.v !== 28) {
      console.warn("⚠️ Unusual v value. Most EIP-2612 implementations expect v to be 27 or 28");
    } else {
      console.log("✅ Signature format looks valid");
    }

    console.log("\nDiagnostic complete. If you still get 'invalid signature' errors:");
    console.log("1. Check that the Router address is correct for your chain");
    console.log("2. Verify the token's permit implementation matches standard EIP-2612");
    console.log("3. Ensure the chainId used for signing matches the actual chain");
  } catch (error) {
    console.error("❌ Error creating permit:", error);
  }

  console.log("==========================================");
}

// Example usage (uncomment to run)
/*
async function runTest() {
  // Use your wallet signer here
  const provider = new ethers.JsonRpcProvider("https://arb1.arbitrum.io/rpc");
  const signer = new ethers.Wallet("YOUR_PRIVATE_KEY", provider);

  // USDC on Arbitrum
  const usdcAddress = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";
  const chainId = 42161; // Arbitrum

  await runPermitDiagnostic(usdcAddress, signer, chainId);
}

runTest().catch(console.error);
*/
