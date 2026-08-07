import { createPublicClient, erc20Abi, http } from "viem";
import { beforeAll } from "vitest";

import { getViemChain } from "configs/chains";
import { getContract } from "configs/contracts";

import { getTestSdk, getTestSigner, TEST_CHAIN_ID } from "./testUtil";

const USDC_ARBITRUM = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";

/**
 * The funded suite pays collateral in USDC, which the routers pull through SyntheticsRouter.
 * A freshly funded wallet has no allowance, and every submit then reverts with
 * "ERC20: transfer amount exceeds allowance" — so grant it once before the tests run.
 */
beforeAll(async () => {
  const signer = getTestSigner();
  // eslint-disable-next-line no-restricted-globals
  const rpcUrl = process.env.GMX_TEST_RPC_URL;

  if (!signer || !rpcUrl) return;

  const spender = getContract(TEST_CHAIN_ID, "SyntheticsRouter") as `0x${string}`;
  const owner = signer.address as `0x${string}`;
  const client = createPublicClient({ chain: getViemChain(TEST_CHAIN_ID), transport: http(rpcUrl) });

  const current = (await client.readContract({
    address: USDC_ARBITRUM,
    abi: erc20Abi,
    functionName: "allowance",
    args: [owner, spender],
  })) as bigint;

  if (current > 0n) return;

  const txHash = await getTestSdk().executeErc20Approve(signer, {
    tokenAddress: USDC_ARBITRUM,
    spender,
  });

  await client.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
}, 120000);
