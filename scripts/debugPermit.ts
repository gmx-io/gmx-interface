/**
 * Token Permit Debugging Script
 *
 * Usage:
 *   $ ts-node scripts/debugPermit.ts <token_address> <chain_id> <private_key>
 *
 * Example:
 *   $ ts-node scripts/debugPermit.ts 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9 42161 your_private_key
 */

import { ethers } from "ethers";
import { runPermitDiagnostic } from "../src/domain/synthetics/gassless/examples/debugPermits";

// Chain RPC URLs
const RPC_URLS: Record<number, string> = {
  1: "https://eth.llamarpc.com", // Ethereum Mainnet
  42161: "https://arb1.arbitrum.io/rpc", // Arbitrum One
  43114: "https://api.avax.network/ext/bc/C/rpc", // Avalanche
  56: "https://bsc-dataseed.binance.org/", // BSC
  137: "https://polygon-rpc.com", // Polygon
  // Add more chains as needed
};

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.error("Usage: ts-node scripts/debugPermit.ts <token_address> <chain_id> <private_key>");
    process.exit(1);
  }

  const [tokenAddress, chainIdStr, privateKey] = args;
  const chainId = parseInt(chainIdStr, 10);

  // Validate input
  if (!ethers.isAddress(tokenAddress)) {
    console.error("Invalid token address");
    process.exit(1);
  }

  if (isNaN(chainId) || !RPC_URLS[chainId]) {
    console.error(`Unknown or unsupported chain ID: ${chainId}`);
    console.error(`Supported chains: ${Object.keys(RPC_URLS).join(", ")}`);
    process.exit(1);
  }

  // Create provider and signer
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URLS[chainId]);
    const signer = new ethers.Wallet(privateKey, provider);

    // Run the diagnostic
    await runPermitDiagnostic(tokenAddress, signer, chainId);
  } catch (error) {
    console.error("Error running permit diagnostic:", error);
    process.exit(1);
  }
}

main().catch(console.error);
