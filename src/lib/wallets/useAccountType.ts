import { getPublicClient } from "@wagmi/core";
import uniq from "lodash/uniq";
import useSWR from "swr";
import type { Hex, PublicClient } from "viem";
import { useAccount } from "wagmi";

import { AnyChainId, CONTRACTS_CHAIN_IDS, SOURCE_CHAIN_IDS } from "config/chains";
import { getIsNonEoaAccountError, nonEoaAccountError } from "lib/errors/customErrors";

import { getRainbowKitConfig } from "./rainbowKitConfig";

enum AccountType {
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
    "0x41675c099f32341bf84bfc5382af534df5c7461a", // v1.4.1
    "0x29fcb43b46531bca003ddc8fcb67ffe91900c762", // v1.4.1 L2
  ].map((a) => a.toLowerCase() as Hex)
);

async function isSafeAccount(
  bytecode: Hex,
  address: string,
  client: PublicClient,
  safeSingletonAddresses: Set<string>
): Promise<boolean> {
  if (bytecode === "0x") {
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

  if (safeSingletonAddresses.size > 0) {
    const isSafe = await isSafeAccount(bytecode, address, client, safeSingletonAddresses);
    if (isSafe) {
      return AccountType.Safe;
    }
  }

  return AccountType.SmartAccount;
}

export function useIsNonEoaAccountOnAnyChain(): boolean {
  const { address } = useAccount();

  const { data: isNonEoaAccountOnAnyChain = false } = useSWR<boolean | undefined>(
    address && [address, "detectIsNonEoaAccountOnAnyChain"],
    {
      fetcher: async (): Promise<boolean | undefined> => {
        if (!address) {
          return undefined;
        }

        const chainIds = uniq((CONTRACTS_CHAIN_IDS as AnyChainId[]).concat(SOURCE_CHAIN_IDS));

        return Promise.all(
          chainIds.map(async (chainId) => {
            const publicClient = getPublicClient(getRainbowKitConfig(), { chainId });

            if (!publicClient) {
              return undefined;
            }

            const accountType = await getAccountType(address, publicClient, new Set<string>());

            const isSomeEoaAccount = accountType === AccountType.EOA || accountType === AccountType.PostEip7702EOA;

            if (!isSomeEoaAccount) {
              return Promise.reject(nonEoaAccountError(chainId));
            }
          })
        )
          .then(() => {
            return false;
          })
          .catch((error) => {
            if (getIsNonEoaAccountError(error)) {
              return true;
            }

            return false;
          });
      },
      refreshInterval: 0,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
    }
  );

  return isNonEoaAccountOnAnyChain;
}
