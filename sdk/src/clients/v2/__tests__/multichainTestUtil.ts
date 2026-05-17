import { createPublicClient, erc20Abi, http, type Chain, type PublicClient } from "viem";
import { base } from "viem/chains";

import { ARBITRUM, SOURCE_BASE_MAINNET, type SourceChainId } from "configs/chains";
import { sleep } from "utils/common";
import { createViemRpc, type IRpc } from "utils/rpc";
import { PrivateKeySigner } from "utils/signer";

import type { GmxApiSdk } from "../index";
import { TEST_CHAIN_ID } from "./testUtil";

export { TEST_CHAIN_ID };

export const TEST_SOURCE_CHAIN_ID: SourceChainId = SOURCE_BASE_MAINNET;

// Pinned to Arbitrum settlement / Base source.
export const USDC_ARBITRUM = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
export const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const STARGATE_USDC_BASE = "0x27a16dc786820B16E5c9028b75B99F6f604b5d26";

const VIEM_CHAIN_BY_SOURCE: Partial<Record<SourceChainId, Chain>> = {
  [SOURCE_BASE_MAINNET]: base,
};

export function hasSourceRpcUrl(): boolean {
  // eslint-disable-next-line no-restricted-globals
  return !!process.env.GMX_TEST_SOURCE_RPC_URL;
}

export function shouldSendOnChain(): boolean {
  // eslint-disable-next-line no-restricted-globals
  return process.env.GMX_TEST_SEND === "1";
}

function requireSourceViemChain(): Chain {
  const chain = VIEM_CHAIN_BY_SOURCE[TEST_SOURCE_CHAIN_ID];
  if (!chain) {
    throw new Error(`No viem chain configured for source chain ${TEST_SOURCE_CHAIN_ID}`);
  }
  return chain;
}

export function getSourceRpc(): IRpc | undefined {
  // eslint-disable-next-line no-restricted-globals
  const url = process.env.GMX_TEST_SOURCE_RPC_URL;
  if (!url) return undefined;
  const client = createPublicClient({
    chain: requireSourceViemChain(),
    transport: http(url),
  }) as unknown as PublicClient;
  return createViemRpc(client);
}

export function getSourceSigner(): PrivateKeySigner | undefined {
  // eslint-disable-next-line no-restricted-globals
  const pk = process.env.GMX_TEST_PRIVATE_KEY;
  // eslint-disable-next-line no-restricted-globals
  const rpcUrl = process.env.GMX_TEST_SOURCE_RPC_URL;
  if (!pk || !rpcUrl) return undefined;
  return new PrivateKeySigner(pk as `0x${string}`, {
    rpcUrl,
    chain: requireSourceViemChain(),
  });
}

export async function ensureSourceErc20Allowance(params: {
  sdk: Pick<GmxApiSdk, "executeErc20Approve">;
  signer: PrivateKeySigner;
  tokenAddress: `0x${string}`;
  spender: `0x${string}`;
  minAmount: bigint;
}): Promise<bigint> {
  // eslint-disable-next-line no-restricted-globals
  const rpcUrl = process.env.GMX_TEST_SOURCE_RPC_URL!;
  const client = createPublicClient({ chain: requireSourceViemChain(), transport: http(rpcUrl) });

  const owner = params.signer.address as `0x${string}`;
  const current = (await client.readContract({
    address: params.tokenAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: [owner, params.spender],
  })) as bigint;

  if (current >= params.minAmount) return current;

  const txHash = await params.sdk.executeErc20Approve(params.signer, {
    tokenAddress: params.tokenAddress,
    spender: params.spender,
  });

  await client.waitForTransactionReceipt({ hash: txHash as `0x${string}` });

  return (await client.readContract({
    address: params.tokenAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: [owner, params.spender],
  })) as bigint;
}

const TERMINAL_WITHDRAW_STATUSES = new Set(["created", "executed", "cancelled", "relay_failed", "relay_reverted"]);

export async function waitForWithdrawStatus(
  sdk: Pick<GmxApiSdk, "getCrossChainWithdrawStatus">,
  requestId: string,
  timeoutMs = 90_000
) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const status = await sdk.getCrossChainWithdrawStatus(requestId);
    if (TERMINAL_WITHDRAW_STATUSES.has(status.status)) {
      return status;
    }
    await sleep(2000);
  }
  return sdk.getCrossChainWithdrawStatus(requestId);
}

export function expectArbitrumSettlement(): void {
  if (TEST_CHAIN_ID !== ARBITRUM) {
    throw new Error(
      `multichain e2e tests pin TEST_CHAIN_ID to ARBITRUM (got ${TEST_CHAIN_ID}). Set GMX_TEST_CHAIN_ID accordingly.`
    );
  }
}
