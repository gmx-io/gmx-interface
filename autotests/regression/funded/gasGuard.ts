import { createPublicClient, http, parseGwei } from "viem";

export type GasCheck = {
  chainId: number;
  allowed: boolean;
  reason: string;
  observedWei?: string;
  limitWei?: string;
};

type GasReader = {
  getChainId(): Promise<number>;
  getGasPrice(): Promise<bigint>;
  getBlock(): Promise<{ timestamp: bigint }>;
};

export async function checkGasPrice({
  chainId,
  rpcUrl,
  maxGasGwei,
  reader,
}: {
  chainId: number;
  rpcUrl?: string;
  maxGasGwei?: string;
  reader?: GasReader;
}): Promise<GasCheck> {
  const blocked = (reason: string): GasCheck => ({ chainId, allowed: false, reason });
  if (!Number.isSafeInteger(chainId) || chainId <= 0) return blocked("Invalid chain ID");
  if (!maxGasGwei || !/^\d+(\.\d{1,9})?$/.test(maxGasGwei) || parseGwei(maxGasGwei) <= 0n) {
    return blocked("Missing or invalid explicit gas limit (gwei)");
  }
  if (!rpcUrl) return blocked("Missing RPC URL");

  const limit = parseGwei(maxGasGwei);
  try {
    const client = reader ?? createPublicClient({ transport: http(rpcUrl, { timeout: 15_000, retryCount: 0 }) });
    const [actualChainId, gasPrice, block] = await Promise.all([
      client.getChainId(),
      client.getGasPrice(),
      client.getBlock(),
    ]);
    if (actualChainId !== chainId) return blocked("RPC chain does not match the required chain");
    const blockAge = BigInt(Math.floor(Date.now() / 1000)) - block.timestamp;
    if (blockAge > 120n || blockAge < -30n) return blocked("RPC latest block is stale or has an invalid timestamp");
    if (gasPrice <= 0n) return blocked("RPC returned an invalid gas price");
    return {
      chainId,
      allowed: gasPrice <= limit,
      reason: gasPrice <= limit ? "Gas is within the configured limit" : "High gas: funded actions must not run",
      observedWei: gasPrice.toString(),
      limitWei: limit.toString(),
    };
  } catch {
    // RPC error messages may contain credentials from the endpoint URL.
    return blocked("RPC unavailable or returned invalid data");
  }
}
