import useSWR from "swr";
import { Hex, PublicClient } from "viem";
import { useAccount, useChainId, usePublicClient } from "wagmi";

import { CHAIN_SLUGS_MAP } from "config/chains";

export enum AccountType {
  Safe,
  SmartAccount, // ERC-4337 compatible smart account
  PostEip7702EOA, // Post-EIP-7702 EOA (delegated EOA)
  EOA,
}

/**
 * Keep this in case if Safe API is down or deprecated some addresses
 * we still should be able to detect Safe accounts
 */
const KNOWN_SAFE_SINGLETONS = new Set(
  [
    "0x3e5c63644e683549055b9be8653de26e0b4cd36e", // v1.3.0 L2 default
    "0xfb1bffc9d739b8d520daf37df666da4c687191ea", // v1.3.0 L2
    "0xd9db270c1b5e3bd161e8c8503c55ceabee709552", // v1.3.0
    "0x69f4d1788e39c87893c980c06edf4b7f686e2938", // v1.3.0
    "0x29fcb43b46531bca003ddc8fcb67ffe91900c762", // v1.4.1 L2
  ].map((a) => a.toLowerCase() as Hex)
);

async function isSafeAccount(
  address: string,
  client: PublicClient,
  safeSingletonAddresses: Set<string>
): Promise<boolean> {
  const bytecode = await client.getBytecode({ address });
  if (!bytecode || bytecode === "0x") {
    return false;
  }

  const storage = await client.getStorageAt({ address, slot: "0x0" });
  if (!storage) {
    return false;
  }

  const masterCopy = `0x${storage.slice(-40)}`.toLowerCase() as Hex;

  return KNOWN_SAFE_SINGLETONS.has(masterCopy) || safeSingletonAddresses.has(masterCopy);
}

async function getAccountType(
  address: string,
  client: PublicClient,
  safeSingletonAddresses: Set<string>
): Promise<AccountType> {
  const bytecode = await client.getBytecode({ address });
  if (!bytecode || bytecode === "0x") {
    return AccountType.EOA;
  }

  if (bytecode.startsWith("0xef0100") && bytecode.length === 48) {
    return AccountType.PostEip7702EOA;
  }

  const isSafe = await isSafeAccount(address, client, safeSingletonAddresses);
  if (isSafe) {
    return AccountType.Safe;
  }

  return AccountType.SmartAccount;
}

export function useAccountType() {
  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();

  const { data: safeSingletonAddresses = new Set<Hex>() } = useSWR<Set<string>>([chainId, "safeSingletons"], {
    fetcher: async () => {
      try {
        const chain = CHAIN_SLUGS_MAP[chainId];
        const response = await fetch(`https://safe-transaction-${chain}.safe.global/api/v1/about/singletons/`);
        const data: { address: string }[] = await response.json();
        return new Set(data.map((item) => item.address.toLowerCase() as Hex));
      } catch (error) {
        return new Set<string>();
      }
    },
  });

  const { data: accountType = null } = useSWR<AccountType | null>(
    address && publicClient && [address, publicClient, chainId, "detectAccountType"],
    {
      fetcher: async () => {
        if (!address || !publicClient || !safeSingletonAddresses) {
          return null;
        }

        const account = await getAccountType(address, publicClient, safeSingletonAddresses);
        return account;
      },
    }
  );

  return {
    accountType,
    isSmartAccount: accountType !== AccountType.EOA && accountType !== AccountType.PostEip7702EOA,
  };
}
