import useSWR from "swr";
import { PublicClient } from "viem";
import { useAccount } from "wagmi";

import { useChainId } from "lib/chains";
import { LRUCache } from "sdk/utils/LruCache";

import { getPublicClientWithRpc } from "./walletConfig";

export enum AccountType {
  PostEip7702EOA, // Post-EIP-7702 EOA (delegated EOA)
  SmartAccount, // has bytecode — in practice always ERC-1271 capable
  EOA,
}

const ACCOUNT_TYPES_CACHE = new LRUCache<Promise<AccountType>>(100);

async function fetchAccountType(address: string, client: PublicClient): Promise<AccountType> {
  const bytecode = await client.getCode({ address });
  if (!bytecode || bytecode === "0x") {
    return AccountType.EOA;
  }

  if (bytecode.startsWith("0xef0100") && bytecode.length === 48) {
    return AccountType.PostEip7702EOA;
  }

  return AccountType.SmartAccount;
}

/** Cached for the page load: signing paths await this before every wallet prompt. */
export function getAccountType(address: string, client: PublicClient): Promise<AccountType> {
  const chainId = client.chain?.id;

  if (chainId === undefined) {
    throw new Error("getAccountType requires a chain-bound client");
  }

  const key = `chainId:${chainId}:address:${address.toLowerCase()}`;
  let accountTypePromise = ACCOUNT_TYPES_CACHE.get(key);

  if (!accountTypePromise) {
    accountTypePromise = fetchAccountType(address, client).catch((error) => {
      ACCOUNT_TYPES_CACHE.delete(key);

      throw error;
    });
    ACCOUNT_TYPES_CACHE.set(key, accountTypePromise);
  }

  return accountTypePromise;
}

/** Type of the connected account on the current chain. */
export function useAccountType(): { accountType: AccountType | undefined; isLoading: boolean } {
  const { address } = useAccount();
  const { chainId } = useChainId();

  const { data: accountType, isLoading } = useSWR<AccountType | undefined>(
    address && [address, chainId, "accountType"],
    {
      fetcher: async () => {
        const publicClient = getPublicClientWithRpc(chainId);

        if (!address || !publicClient) {
          return undefined;
        }

        return getAccountType(address, publicClient);
      },
      refreshInterval: 0,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
    }
  );

  return { accountType, isLoading };
}
