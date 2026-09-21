import { type Address, encodeAbiParameters, keccak256 } from "viem";

import { ARBITRUM_SEPOLIA } from "config/chains";
import { getContract } from "config/contracts";
import { getPublicClientWithRpc } from "lib/wallets/walletConfig";
import { abis } from "sdk/abis";
import { hashString } from "sdk/utils/hash";

export type EsGmxDistribution = {
  sender: Address;
  recipient: Address;
  epochId: bigint;
  batchIndex: bigint;
  amount: bigint;
};

export async function getEsGmxIssuerFunding(account: Address, amount: bigint) {
  const client = getPublicClientWithRpc(ARBITRUM_SEPOLIA);
  const issuer = { address: getContract(ARBITRUM_SEPOLIA, "EsGmxIssuer"), abi: abis.EsGmxIssuer } as const;
  const token = { address: getContract(ARBITRUM_SEPOLIA, "IncentiveEsGmx"), abi: abis.Token } as const;
  const [issued, claimed, balance, walletBalance] = await client.multicall({
    allowFailure: false,
    contracts: [
      { ...issuer, functionName: "totalIssuedAmount" },
      { ...issuer, functionName: "totalClaimedAmount" },
      { ...token, functionName: "balanceOf", args: [issuer.address] },
      { ...token, functionName: "balanceOf", args: [account] },
    ],
  });
  const shortfall = issued - claimed + amount - balance;
  return { shortfall: shortfall > 0n ? shortfall : 0n, walletBalance };
}

export async function getUnusedEsGmxDistributionBatchIndex(epochId: bigint) {
  const client = getPublicClientWithRpc(ARBITRUM_SEPOLIA);
  const issuer = { address: getContract(ARBITRUM_SEPOLIA, "EsGmxIssuer"), abi: abis.EsGmxIssuer } as const;
  const [, entryCount] = await client.readContract({ ...issuer, functionName: "epochs", args: [epochId] });

  // Each processed batch has at least one entry, so these indexes include an unused one.
  for (let start = 0n; start <= entryCount; start += 32n) {
    const count = Number(entryCount - start + 1n > 32n ? 32n : entryCount - start + 1n);
    const used = await client.multicall({
      allowFailure: false,
      contracts: Array.from({ length: count }, (_, offset) => ({
        ...issuer,
        functionName: "processedBatchIndexes" as const,
        args: [epochId, start + BigInt(offset)] as const,
      })),
    });
    const offset = used.indexOf(false);
    if (offset !== -1) return start + BigInt(offset);
  }

  throw new Error("Unable to find an unused distribution batch index");
}

export async function getEsGmxDistributionError({ sender, recipient, epochId, batchIndex, amount }: EsGmxDistribution) {
  const client = getPublicClientWithRpc(ARBITRUM_SEPOLIA);
  const issuer = { address: getContract(ARBITRUM_SEPOLIA, "EsGmxIssuer"), abi: abis.EsGmxIssuer } as const;
  const roleStore = await client.readContract({ ...issuer, functionName: "roleStore" });
  const batchHash = keccak256(
    encodeAbiParameters([{ type: "address[]" }, { type: "uint256[]" }], [[recipient], [amount]])
  );
  const [hasRole, epoch, usedIndex, usedContent, issued, claimed, balance] = await client.multicall({
    allowFailure: false,
    contracts: [
      {
        address: roleStore,
        abi: abis.RoleStore,
        functionName: "hasRole",
        args: [sender, hashString("INCENTIVE_DISTRIBUTOR")],
      },
      { ...issuer, functionName: "epochs", args: [epochId] },
      { ...issuer, functionName: "processedBatchIndexes", args: [epochId, batchIndex] },
      { ...issuer, functionName: "processedBatchHashes", args: [epochId, batchHash] },
      { ...issuer, functionName: "totalIssuedAmount" },
      { ...issuer, functionName: "totalClaimedAmount" },
      {
        address: getContract(ARBITRUM_SEPOLIA, "IncentiveEsGmx"),
        abi: abis.Token,
        functionName: "balanceOf",
        args: [issuer.address],
      },
    ],
  });

  if (!hasRole) return { reason: "unauthorized" } as const;
  if (epoch[0]) return { reason: "finalized" } as const;
  if (usedIndex) return { reason: "usedIndex" } as const;
  if (usedContent) return { reason: "usedContent" } as const;
  const requiredBalance = issued - claimed + amount;
  if (balance < requiredBalance) return { reason: "funding", shortfall: requiredBalance - balance } as const;
  return undefined;
}
